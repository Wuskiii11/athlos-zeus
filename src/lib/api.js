import { supabase, hasSupabase, supabaseUrl, supabaseKey } from "./supabase";

// ─────────────────────────────────────────────────────────────
// Unified data layer for ATHLOS.
//
// If Supabase keys are configured (src/lib/supabase.js) → real cloud backend.
// Otherwise → local demo mode using localStorage, so the app keeps working
// with the demo credentials (email starts with "athlos@", password "123").
//
// The rest of the app only imports from here — it never talks to Supabase
// directly. To migrate fully you only ever touch this file.
// ─────────────────────────────────────────────────────────────

export { hasSupabase };

const LS = "athlos:v1";
const readLS = () => {
  try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; }
};
const writeLS = (patch) => {
  try { localStorage.setItem(LS, JSON.stringify({ ...readLS(), ...patch })); } catch {}
};

const DEMO_SALT = "athlos-local-demo-v1";
async function hashPassword(password) {
  const input = new TextEncoder().encode(`${DEMO_SALT}:${password}`);
  const bytes = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyLocalPassword(stored, password) {
  if (stored.passwordHash) return stored.passwordHash === await hashPassword(password);
  return password === (stored.password || "123");
}

async function upgradeLocalPasswordStorage(stored, password) {
  if (!stored.passwordHash || stored.password) {
    const next = { ...stored, passwordHash: await hashPassword(password) };
    delete next.password;
    writeLS(next);
  }
}

// ── Session ──────────────────────────────────────────────────
export async function getSession() {
  if (hasSupabase) {
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  }
  const s = readLS();
  return s.registered ? { user: { id: "local", email: s.email || "athlos@local" } } : null;
}

export function onAuthChange(cb) {
  if (hasSupabase) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session || null));
    return () => data.subscription.unsubscribe();
  }
  return () => {};
}

// ── Auth ─────────────────────────────────────────────────────
export async function signIn(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (hasSupabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) throw new Error("Napačni podatki za prijavo.");
    return data.user;
  }
  // Local demo fallback
  const s = readLS();
  const hasLocalAccount = !!(s.email && (s.passwordHash || s.password));
  const okUser = hasLocalAccount ? s.email.toLowerCase() === normalizedEmail : normalizedEmail.startsWith("athlos@");
  if (!okUser || !(await verifyLocalPassword(s, password))) throw new Error("Napačni podatki za prijavo.");
  await upgradeLocalPasswordStorage(s, password);
  writeLS({ registered: true, email: normalizedEmail });
  return { id: "local", email: normalizedEmail };
}

export async function signUp(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (hasSupabase) {
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (error) throw new Error(error.message);
    // Supabase obfuscates "user already exists" (returns a user with no identities)
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error("Račun s tem e-naslovom že obstaja.");
    }
    return data.user;
  }
  const s = readLS();
  if (s.email && s.email.toLowerCase() === normalizedEmail && (s.passwordHash || s.password)) {
    throw new Error("Račun s tem e-naslovom že obstaja.");
  }
  writeLS({ registered: true, email: normalizedEmail, passwordHash: await hashPassword(password) });
  return { id: "local", email: normalizedEmail };
}

// OAuth (Apple / Google) — redirects the browser to the provider, then back.
// On return the app restores the session via getSession() on mount.
export async function signInWithProvider(provider) {
  const providerName = provider === "apple" ? "Apple" : "Google";
  if (!hasSupabase) {
    throw new Error("Prijava z " + providerName + " računom deluje samo v oblačni različici (Supabase).");
  }
  // The "provider not enabled" error only surfaces AFTER the redirect (as a raw
  // JSON page), so check the public auth settings first and fail gracefully here.
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey } });
    const settings = await res.json();
    if (!settings?.external?.[provider]) {
      throw new Error(`Prijava z ${providerName} računom še ni vklopljena.`);
    }
  } catch (e) {
    if ((e.message || "").includes("ni vklopljena")) throw e;
    // Settings check failed (network etc.) — continue and let OAuth try anyway.
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (hasSupabase) await supabase.auth.signOut();
  writeLS({ registered: false });
}

export async function changePassword(oldPassword, newPassword) {
  if (hasSupabase) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return;
  }
  const s = readLS();
  if (!(await verifyLocalPassword(s, oldPassword))) throw new Error("Staro geslo ni pravilno.");
  const next = { ...s, passwordHash: await hashPassword(newPassword) };
  delete next.password;
  writeLS(next);
}

// Sends the real "reset your password" email via Supabase Auth.
export async function requestPasswordReset(email) {
  if (!hasSupabase) throw new Error("Ponastavitev gesla po e-pošti deluje samo v oblačni različici (Supabase).");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw new Error(error.message);
}

// Updates the login e-mail (Supabase sends a confirmation link to the new
// address; the change only takes effect once it's clicked).
export async function changeEmail(newEmail) {
  if (!hasSupabase) throw new Error("Sprememba e-pošte deluje samo v oblačni različici (Supabase).");
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw new Error(error.message);
}

// ── Profile ──────────────────────────────────────────────────
const hasProfileData = (p) => !!(p && (p.name || p.sport || p.birth || p.role === "coach"));

// Real columns on the `profiles` table. Everything else the app keeps on the
// profile object (goals, injuries, equipment, …) lives only in the local cache —
// sending it to Supabase would 400 the whole upsert on the unknown column.
const PROFILE_COLUMNS = ["name", "sport", "birth", "height", "weight", "photo", "plan", "lang", "role", "theme"];

export async function loadProfile(userId) {
  const cached = readLS().profileCache?.[userId] || null;
  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from("profiles").select("*").eq("id", userId).maybeSingle();
      // Cloud is the source of truth for its columns (name, lang, theme, …); the
      // cache carries the extra fields. Only trust a completed row (else a bare
      // auto-created row with no name would force setup again).
      if (!error && hasProfileData(data)) return { ...(cached || {}), ...data };
    } catch {}
    // Cloud empty/unreachable → the local cache (a finished setup survives).
    return cached;
  }
  return readLS().profile || null;
}

export async function saveProfile(userId, profile) {
  if (hasSupabase) {
    // Cache the FULL profile locally first, so nothing is lost to a partial or
    // blocked cloud write.
    const cache = readLS().profileCache || {};
    writeLS({ profileCache: { ...cache, [userId]: profile } });
    // Send only real columns; extra keys would fail the whole upsert.
    const row = { id: userId, updated_at: new Date().toISOString() };
    for (const k of PROFILE_COLUMNS) if (profile[k] != null) row[k] = profile[k];
    let { error } = await supabase.from("profiles").upsert(row);
    // `theme` column may not be migrated yet — retry without it rather than fail.
    if (error && /theme/i.test(error.message || "")) {
      const { theme, ...rest } = row;
      ({ error } = await supabase.from("profiles").upsert(rest));
    }
    if (error) throw new Error(error.message);
    return;
  }
  writeLS({ profile });
}

// ── User search & unique names ───────────────────────────────
// Both go through SECURITY DEFINER RPCs on the server, because the profiles
// RLS is "own row only" — a direct select could never find other people.
export async function searchUsers(q) {
  if (!hasSupabase || !q || q.trim().length < 2) return [];
  const { data, error } = await supabase.rpc("search_users", { q: q.trim() });
  if (error) return [];
  return (data || []).map((r) => ({
    user_id: r.user_id,
    name: r.name,
    photo: r.photo || null,
    initials: (r.name || "?").trim().charAt(0).toUpperCase() || "?",
  }));
}

// Public slice of other users' profiles (name + avatar URL) — the profiles RLS
// is "own row only", so this goes through the public_profiles RPC.
export async function getPublicProfiles(ids = []) {
  if (!hasSupabase || !ids.length) return {};
  try {
    const { data, error } = await supabase.rpc("public_profiles", { ids });
    if (error) return {};
    const map = {};
    (data || []).forEach((r) => { map[r.user_id] = { name: r.name, photo: r.photo || null }; });
    return map;
  } catch { return {}; }
}

// True when someone ELSE already uses this display name (case-insensitive).
export async function isNameTaken(n) {
  if (!hasSupabase || !n?.trim()) return false;
  const { data, error } = await supabase.rpc("name_taken", { n: n.trim() });
  return !error && !!data;
}

// Upload the avatar to Storage and return its public URL — a tiny string that
// always fits profiles.photo. (Base64 data URLs from phone cameras are
// megabytes and made the profile upsert fail silently, losing the picture.)
export async function uploadAvatar(userId, blob) {
  if (!hasSupabase) return null;
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl || null;
}

// The athlete's club name (via the athletes table) — null if they're not in one.
// Enables the "Klub" tab. Safe if the tables don't exist yet.
export async function getAthleteClub(userId) {
  if (!hasSupabase) return null;
  try {
    const { data } = await supabase
      .from("athletes").select("clubs(name)").eq("user_id", userId).maybeSingle();
    return data?.clubs?.name || null;
  } catch { return null; }
}

// ── Season events ────────────────────────────────────────────
// Event shape used by the app: { id, type, title, date "YYYY-MM-DD", time "HH:MM" }

export async function listEvents(userId) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from("season_events").select("id,type,title,date,time,completed")
      .eq("user_id", userId).order("date");
    if (error) throw new Error(error.message);
    return data || [];
  }
  return readLS().events || [];
}

// Mark today's training event(s) as completed — called when a workout
// session is finished, so the calendar reflects it without needing the
// session screen to know a specific event id.
export async function completeTodaysTraining(userId) {
  const today = new Date().toISOString().slice(0, 10);
  if (hasSupabase) {
    const { error } = await supabase
      .from("season_events")
      .update({ completed: true })
      .eq("user_id", userId).eq("date", today).eq("type", "trening");
    if (error) throw new Error(error.message);
    return;
  }
  const events = readLS().events || [];
  const updated = events.map((e) => (e.date === today && e.type === "trening" ? { ...e, completed: true } : e));
  writeLS({ events: updated });
}

export async function addEvent(userId, ev) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from("season_events")
      .insert({ user_id: userId, type: ev.type, title: ev.title, date: ev.date, time: ev.time })
      .select("id,type,title,date,time").single();
    if (error) throw new Error(error.message);
    return data;
  }
  const withId = { ...ev, id: ev.id || Date.now() };
  writeLS({ events: [...(readLS().events || []), withId] });
  return withId;
}

export async function deleteEvent(userId, id) {
  if (hasSupabase) {
    const { error } = await supabase.from("season_events").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  writeLS({ events: (readLS().events || []).filter((e) => e.id !== id) });
}

// Replace the whole plan (used by the AI plan generator)
export async function replaceEvents(userId, events) {
  if (hasSupabase) {
    await supabase.from("season_events").delete().eq("user_id", userId);
    if (events.length) {
      const rows = events.map((ev) => ({ user_id: userId, type: ev.type, title: ev.title, date: ev.date, time: ev.time }));
      const { error } = await supabase.from("season_events").insert(rows);
      if (error) throw new Error(error.message);
    }
    return listEvents(userId);
  }
  const withIds = events.map((ev, i) => ({ ...ev, id: ev.id || Date.now() + i }));
  writeLS({ events: withIds });
  return withIds;
}

// ── Workouts (completed trainings) ───────────────────────────
export async function saveWorkout(userId, workout) {
  if (hasSupabase) {
    const { error } = await supabase.from("workouts").insert({
      user_id: userId,
      title: workout.title,
      date: workout.date || new Date().toISOString().slice(0, 10),
      duration_sec: workout.durationSec || 0,
      sets_done: workout.setsDone || 0,
      exercises: workout.exercises || null,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const w = { ...workout, id: Date.now(), date: workout.date || new Date().toISOString().slice(0, 10) };
  writeLS({ workouts: [...(readLS().workouts || []), w] });
}

export async function listWorkouts(userId, limit = 30) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from("workouts").select("id,title,date,duration_sec,sets_done,exercises")
      .eq("user_id", userId).order("date", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }
  return (readLS().workouts || []).slice(-limit).reverse();
}

// ── AI coach ─────────────────────────────────────────────────
export async function loadAiHistory(userId, limit = 40) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from("ai_messages").select("role,content,created_at")
      .eq("user_id", userId).order("created_at").limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }
  return readLS().aiHistory || [];
}

async function saveAiMessage(userId, role, content) {
  if (hasSupabase) {
    await supabase.from("ai_messages").insert({ user_id: userId, role, content });
    return;
  }
  const h = [...(readLS().aiHistory || []), { role, content, created_at: new Date().toISOString() }];
  writeLS({ aiHistory: h.slice(-80) });
}

// Ask the AI coach via the "ai-coach" Edge Function. Returns the reply text,
// or null when the function isn't deployed / no backend — caller falls back
// to the local demo answers, so the screen never breaks.
export async function askAI(userId, question, history = [], profile = {}, memory = null, attachment = null) {
  try { await saveAiMessage(userId, "user", attachment ? `[priponka: ${attachment.name}] ${question}` : question); } catch {}
  if (!hasSupabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke("ai-coach", {
      body: {
        question,
        history: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        profile: { name: profile.name, sport: profile.sport, height: profile.height, weight: profile.weight },
        memory: memory || undefined,   // učeča se baza (cilj/nivo/faza/oprema/poškodbe + opombe + feedback)
        attachment: attachment || undefined, // { name, mime, data(base64) } — slika/PDF za vision
      },
    });
    if (error || !data?.reply) return null;
    // The agent "learns": pull any [[NOTE: ...]] it emits into the memory base,
    // strip them from the athlete-facing reply, and store the clean text.
    const { text, notes } = parseCoachReply(data.reply);
    for (const n of notes) { try { await addCoachNote(userId, n); } catch {} }
    try { await saveAiMessage(userId, "assistant", text); } catch {}
    return text;
  } catch {
    return null;
  }
}

// Persist a fallback (demo) reply into history so the conversation stays whole.
export async function saveAiReply(userId, content) {
  try { await saveAiMessage(userId, "assistant", content); } catch {}
}

// ── Coach memory — UČEČA SE baza (per-športnik) ──────────────
// Blob shape: { setup:{goal,level,seasonPhase,equipment[],daysPerWeek,sessionMinutes,injuries[]},
//               notes:[], feedback:[{date,rpe,completed,pain[],note}], onboardedAt }
// Demo mode (brez Supabase) hrani isti blob v localStorage, tako da funnel-gate +
// spomin + feedback delujejo tudi lokalno.
export async function loadCoachMemory(userId) {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from("coach_memory").select("data").eq("user_id", userId).maybeSingle();
      if (!error && data?.data) return data.data;
    } catch {}
    // Fall back to localStorage cache if Supabase fails or table doesn't exist yet
    return readLS().coachMemory || null;
  }
  return readLS().coachMemory || null;
}

export async function saveCoachMemory(userId, memory) {
  const data = { ...(memory || {}) };
  // Always write to localStorage as a cache so re-navigation doesn't lose the setup
  writeLS({ coachMemory: data });
  if (hasSupabase) {
    try {
      const { error } = await supabase.from("coach_memory")
        .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    } catch (e) {
      // localStorage already saved above — Supabase failure is non-fatal
    }
    return data;
  }
  return data;
}

// Append a training-feedback entry ("kako je šlo zadnjič") and persist.
export async function saveCoachFeedback(userId, fb) {
  const mem = (await loadCoachMemory(userId)) || {};
  mem.feedback = [...(mem.feedback || []), { date: new Date().toISOString(), ...fb }].slice(-40);
  return saveCoachMemory(userId, mem);
}

// Append a learned note (this is how the agent "learns" about the athlete over time).
export async function addCoachNote(userId, note) {
  const text = String(note || "").trim();
  if (!text) return null;
  const mem = (await loadCoachMemory(userId)) || {};
  mem.notes = [...(mem.notes || []), text].slice(-60);
  return saveCoachMemory(userId, mem);
}

// Pull any [[NOTE: ...]] markers the agent emits (to remember something) out of a reply.
// Returns the athlete-facing text (markers stripped) + the extracted notes.
export function parseCoachReply(reply) {
  const r = String(reply || "");
  const notes = [];
  const re = /\[\[NOTE:\s*([^\]]+?)\s*\]\]/gi;
  let m;
  while ((m = re.exec(r)) !== null) { const t = m[1].trim(); if (t) notes.push(t); }
  const text = r.replace(/\[\[NOTE:[^\]]*\]\]/gi, "").replace(/\n{3,}/g, "\n\n").trim();
  return { text, notes };
}

// ── Chat ─────────────────────────────────────────────────────
// Demo athletes (matching the seeded data in coach-data.sql)
const DEMO_ATHLETES = [
  { user_id: "athlete-luka",  name: "Luka Kovač",     initials: "LK", sport: "Nogomet", club: "NK Domžale" },
  { user_id: "athlete-nina",  name: "Nina Mlakar",    initials: "NM", sport: "Nogomet", club: "NK Domžale" },
  { user_id: "athlete-tim",   name: "Tim Žagar",      initials: "TŽ", sport: "Nogomet", club: "NK Domžale" },
  { user_id: "athlete-eva",   name: "Eva Horvat",     initials: "EH", sport: "Nogomet", club: "NK Domžale" },
  { user_id: "athlete-jure",  name: "Jure Novak",     initials: "JN", sport: "Nogomet", club: "NK Domžale" },
  { user_id: "athlete-ana",   name: "Ana Kos",        initials: "AK", sport: "Nogomet", club: "NK Domžale" },
  { user_id: "athlete-marko", name: "Marko Potočnik", initials: "MP", sport: "Nogomet", club: "NK Domžale" },
];

const chatLS = () => readLS().chat || {};
const writeChatLS = (patch) => writeLS({ chat: { ...chatLS(), ...patch } });

// Returns list of clubmates the current user can chat with.
export async function listClubmates(userId) {
  if (hasSupabase) {
    try {
      const { data: myRow } = await supabase
        .from("athletes").select("club_id").eq("user_id", userId).maybeSingle();
      if (!myRow?.club_id) return [];
      const { data } = await supabase
        .from("athletes").select("user_id, name, initials, clubs(name)")
        .eq("club_id", myRow.club_id).neq("user_id", userId);
      const rows = (data || []).filter(a => a.user_id);
      // avatars live on profiles (own-row RLS) — pull them via the public RPC
      const pubs = await getPublicProfiles(rows.map(a => a.user_id));
      return rows.map(a => ({
        user_id: a.user_id,
        name: a.name,
        initials: a.initials,
        photo: pubs[a.user_id]?.photo || null,
        club: a.clubs?.name || "",
        sport: "",
      }));
    } catch { return []; }
  }
  return DEMO_ATHLETES.filter(a => a.user_id !== userId);
}

// Returns or creates the single direct conversation between two users.
export async function getOrCreateDirectConversation(userId, otherUserId) {
  if (hasSupabase) {
    // Find existing shared conversation of type 'direct'
    const { data: myConvs } = await supabase
      .from("conversation_members").select("conversation_id").eq("user_id", userId);
    if (myConvs?.length) {
      const myIds = myConvs.map(r => r.conversation_id);
      const { data: shared } = await supabase
        .from("conversation_members").select("conversation_id")
        .eq("user_id", otherUserId).in("conversation_id", myIds);
      if (shared?.length) {
        const { data: conv } = await supabase
          .from("conversations").select("*")
          .eq("id", shared[0].conversation_id).eq("type", "direct").maybeSingle();
        if (conv) return withBgOverride(conv);
      }
    }
    // Create new
    const { data: conv, error } = await supabase
      .from("conversations").insert({ type: "direct", created_by: userId }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);
    return conv;
  }
  // Local mode: key by sorted pair
  const key = [userId, otherUserId].sort().join("~");
  const chat = chatLS();
  if (chat.convs?.[key]) return withBgOverride(chat.convs[key]);
  const conv = { id: key, type: "direct", created_by: userId, background: "default", created_at: new Date().toISOString() };
  writeChatLS({ convs: { ...(chat.convs || {}), [key]: conv } });
  return conv;
}

export async function createGroupConversation(userId, name, memberIds) {
  const allIds = [userId, ...memberIds];
  if (hasSupabase) {
    const { data: conv, error } = await supabase
      .from("conversations").insert({ type: "group", name, created_by: userId }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("conversation_members").insert(
      allIds.map(uid => ({ conversation_id: conv.id, user_id: uid }))
    );
    return conv;
  }
  const id = `grp-${Date.now()}`;
  const conv = { id, type: "group", name, created_by: userId, members: allIds, background: "default", created_at: new Date().toISOString() };
  const chat = chatLS();
  writeChatLS({ convs: { ...(chat.convs || {}), [id]: conv } });
  return conv;
}

export async function listConversations(userId) {
  if (hasSupabase) {
    try {
      const { data: membership } = await supabase
        .from("conversation_members").select("conversation_id").eq("user_id", userId);
      if (!membership?.length) return [];
      const ids = membership.map(r => r.conversation_id);
      const { data: convs } = await supabase
        .from("conversations").select("*").in("id", ids);
      const result = await Promise.all((convs || []).map(async (conv) => {
        const { data: lastMsgArr } = await supabase
          .from("messages").select("content,type,created_at,sender_id")
          .eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1);
        const lastMsg = lastMsgArr?.[0] || null;
        let otherUser = null;
        if (conv.type === "direct") {
          const { data: others } = await supabase
            .from("conversation_members").select("user_id").eq("conversation_id", conv.id).neq("user_id", userId);
          const otherId = others?.[0]?.user_id;
          if (otherId) {
            const { data: ath } = await supabase
              .from("athletes").select("name, initials, clubs(name)").eq("user_id", otherId).maybeSingle();
            otherUser = { user_id: otherId, name: ath?.name || "Neznano", initials: ath?.initials || "?", club: ath?.clubs?.name || "" };
          }
        }
        return withBgOverride({ ...conv, lastMsg, otherUser });
      }));
      // one RPC for all the avatars (photo lives on profiles, own-row RLS)
      const pubs = await getPublicProfiles(result.filter(c => c.otherUser?.user_id).map(c => c.otherUser.user_id));
      result.forEach((c) => {
        const p = c.otherUser && pubs[c.otherUser.user_id];
        if (p) c.otherUser = { ...c.otherUser, photo: p.photo, name: c.otherUser.name === "Neznano" ? (p.name || c.otherUser.name) : c.otherUser.name };
      });
      return result.sort((a, b) => new Date(b.lastMsg?.created_at || b.created_at) - new Date(a.lastMsg?.created_at || a.created_at));
    } catch { return []; }
  }
  // Local mode
  const chat = chatLS();
  return Object.values(chat.convs || {}).map(conv => {
    const msgs = chat.msgs?.[conv.id] || [];
    const lastMsg = msgs[msgs.length - 1] || null;
    let otherUser = null;
    if (conv.type === "direct") {
      const otherId = conv.id.split("~").find(p => p !== userId);
      otherUser = DEMO_ATHLETES.find(a => a.user_id === otherId) || null;
    }
    return withBgOverride({ ...conv, lastMsg, otherUser });
  }).sort((a, b) => new Date(b.lastMsg?.created_at || b.created_at) - new Date(a.lastMsg?.created_at || a.created_at));
}

export async function listMessages(convId, limit = 60) {
  // Only real (cloud) conversations have UUID ids; prototype/demo convs live in
  // localStorage, so read those there even when Supabase is configured.
  if (hasSupabase && isUuid(convId)) {
    const { data, error } = await supabase
      .from("messages").select("*").eq("conversation_id", convId)
      .order("created_at").limit(limit);
    if (error) return [];
    return data || [];
  }
  const chat = chatLS();
  return (chat.msgs?.[convId] || []).slice(-limit);
}

export async function sendMessage(convId, senderId, type, content, attachmentUrl = null) {
  const now = new Date().toISOString();
  // Real (cloud) conversations have UUID ids; prototype/demo convs (non-UUID)
  // only exist locally, so route those to localStorage even in Supabase mode —
  // otherwise the insert fails the uuid/FK check and the message is lost.
  if (hasSupabase && isUuid(convId)) {
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: convId, sender_id: senderId, type, content,
      attachment_url: attachmentUrl, created_at: now,
    }).select().single();
    if (!error && data) return data;
    // fall through to local persistence if the cloud write failed
  }
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const msg = { id, conversation_id: convId, sender_id: senderId, type, content, attachment_url: attachmentUrl, created_at: now };
  const chat = chatLS();
  writeChatLS({ msgs: { ...(chat.msgs || {}), [convId]: [...(chat.msgs?.[convId] || []), msg] } });
  return msg;
}

export async function deleteMessage(msgId, userId) {
  if (hasSupabase) {
    await supabase.from("messages").delete().eq("id", msgId).eq("sender_id", userId);
    return;
  }
  const chat = chatLS();
  const msgs = {};
  for (const [convId, convMsgs] of Object.entries(chat.msgs || {})) {
    msgs[convId] = convMsgs.filter(m => m.id !== msgId);
  }
  writeChatLS({ msgs });
}

export async function uploadChatFile(file, userId) {
  if (!hasSupabase) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return publicUrl;
}

export async function blockUser(blockerId, blockedId) {
  if (hasSupabase) {
    await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
    return;
  }
  const chat = chatLS();
  writeChatLS({ blocks: [...new Set([...(chat.blocks || []), blockedId])] });
}

export async function unblockUser(blockerId, blockedId) {
  if (hasSupabase) {
    await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
    return;
  }
  const chat = chatLS();
  writeChatLS({ blocks: (chat.blocks || []).filter(id => id !== blockedId) });
}

export async function listBlocks(userId) {
  if (hasSupabase) {
    const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
    return (data || []).map(r => r.blocked_id);
  }
  return chatLS().blocks || [];
}

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");

// Applies any locally-cached background override on top of a conversation
// object. Demo/prototype conversations have no Supabase row to read the
// background back from, and even real conversations get an instant local
// mirror so a background change is never lost to a flaky network call.
function withBgOverride(conv) {
  const over = chatLS().bgOverrides || {};
  return over[conv.id] ? { ...conv, background: over[conv.id] } : conv;
}

// Persists the chosen chat background/theme so it survives a reload.
// Real (Supabase-backed) conversations save to the `conversations.background`
// column; ALL conversations (including demo/prototype ones with non-UUID
// ids, which have no row to update there) are also mirrored into a
// localStorage override map, so the choice sticks even offline or if the
// Supabase write silently fails.
export async function updateConversationBackground(convId, bg) {
  if (hasSupabase && isUuid(convId)) {
    supabase.from("conversations").update({ background: bg }).eq("id", convId).then(() => {}, () => {});
  }
  const chat = chatLS();
  const convs = { ...(chat.convs || {}) };
  if (convs[convId]) convs[convId] = { ...convs[convId], background: bg };
  writeChatLS({ convs, bgOverrides: { ...(chat.bgOverrides || {}), [convId]: bg } });
}

// ── Read state (device-local) ────────────────────────────────
// There's no server-side read receipt; unread is tracked per device so that
// opening a conversation clears its dot. Map of { convId: ISO timestamp read }.
export function loadChatReads() {
  return chatLS().reads || {};
}

export function markChatRead(convId) {
  const reads = { ...(chatLS().reads || {}), [convId]: new Date().toISOString() };
  writeChatLS({ reads });
  return reads;
}
