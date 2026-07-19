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

// Permanently deletes the signed-in user's account: the auth user (via the
// delete-account Edge Function — needs the service_role key, so it can't run
// client-side) plus every row that references it (profiles, athletes,
// coaches, events, workouts, chats, ...) through `on delete cascade`.
// Irreversible. Clears local state either way so the device forgets them.
export async function deleteAccount() {
  if (hasSupabase) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error("You're not signed in.");
    const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey },
    });
    if (!res.ok) {
      let msg = "Could not delete your account — try again.";
      try { msg = (await res.json()).error || msg; } catch {}
      throw new Error(msg);
    }
    await supabase.auth.signOut();
  }
  try { localStorage.clear(); } catch {}
}

// ── Profile ──────────────────────────────────────────────────
const hasProfileData = (p) => !!(p && (p.name || p.sport || p.birth || p.role === "coach"));

// Real columns on the `profiles` table. Everything else the app keeps on the
// profile object (goals, injuries, equipment, …) lives only in the local cache —
// sending it to Supabase would 400 the whole upsert on the unknown column.
// NOTE: `role` is intentionally NOT here. It is developer-controlled (coach vs
// athlete) and must never be writable from the client — the app only ever reads
// it. A DB trigger (profiles_lock_role, see supabase/schema.sql) enforces the
// same rule server-side, so only a developer via Supabase can grant "coach".
const PROFILE_COLUMNS = ["name", "sport", "birth", "height", "weight", "photo", "plan", "lang", "theme"];

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

// ─────────────────────────────────────────────────────────────
// Clubs & community — real multi-user flows for the demo.
// Coach: creates a club at onboarding, adds athletes by display name.
// Athlete: searches a club (by club or coach name), joins, chats.
// Requires supabase/demo-upgrade.sql to be applied.
// ─────────────────────────────────────────────────────────────

const initialsOf = (name) =>
  (name || "?").trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join("") || "?";

// Device-local fallback for the coach's club — used until the Supabase
// demo-upgrade.sql is applied (club tables aren't writable before that).
const coachClubKey = (id) => `athlos:coachclub:${id}`;
const readLocalCoachClub = (coachId) => {
  try { const raw = localStorage.getItem(coachClubKey(coachId)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};

// The coach's own coaches row joined with their club. Null → needs onboarding.
// clubs(*) — never name optional columns (location/conversation_id may not be
// migrated yet); normalize them so callers can rely on the keys existing.
const normClub = (c) => c && ({ ...c, location: c.location ?? null, conversation_id: c.conversation_id ?? null });

export async function getMyCoachClub(coachId) {
  if (hasSupabase) {
    try {
      const { data } = await supabase
        .from("coaches")
        .select("id, name, role, club_id, clubs(*)")
        .eq("id", coachId).maybeSingle();
      if (data?.club_id && data.clubs) {
        return { coachName: data.name, role: data.role, club: normClub(data.clubs) };
      }
    } catch { /* fall through to local */ }
  }
  return readLocalCoachClub(coachId);
}

// Coach onboarding: create the club, the coaches row, and the club's group
// conversation in one go. If the cloud write is blocked (demo-upgrade.sql not
// applied yet), the club is kept on-device so onboarding still completes.
export async function createClubWithCoach(coachId, coachName, clubName, location) {
  const name = clubName.trim();
  const loc = (location || "").trim() || null;

  if (hasSupabase) {
    try {
      let club = null;
      // `location` column may not be migrated yet — retry without it.
      let res = await supabase.from("clubs").insert({ name, location: loc }).select().single();
      if (res.error && /location/i.test(res.error.message || "")) {
        res = await supabase.from("clubs").insert({ name }).select().single();
      }
      if (res.error) throw new Error(res.error.message);
      club = res.data;

      const { error: coachErr } = await supabase
        .from("coaches")
        .upsert({ id: coachId, club_id: club.id, name: coachName.trim(), role: "Head coach" });
      if (coachErr) throw new Error(coachErr.message);

      // Club group chat — the coach creates it and is its first member.
      let convId = null;
      try {
        const conv = await createGroupConversation(coachId, name, []);
        convId = conv.id;
        await supabase.from("clubs").update({ conversation_id: convId }).eq("id", club.id);
      } catch { /* chat is optional — club still works without it */ }

      return { coachName: coachName.trim(), role: "Head coach", club: { ...club, location: club.location ?? loc, conversation_id: convId } };
    } catch { /* cloud blocked (RLS / missing column) → fall through to local */ }
  }

  const cc = {
    coachName: coachName.trim(),
    role: "Head coach",
    local: true, // not in the cloud yet — athletes can't find this club until Supabase is unlocked
    club: { id: `local-${coachId.slice(0, 8)}`, name, location: loc, conversation_id: null },
  };
  try { localStorage.setItem(coachClubKey(coachId), JSON.stringify(cc)); } catch {}
  return cc;
}

// All athletes in the coach's club (with avatars from profiles).
// Only rows that belong to a coach count — legacy/demo rows that no coach
// ever added (coach_id null) are treated as noise and never shown.
export async function listClubAthletes(clubId) {
  if (!hasSupabase || !clubId) return [];
  try {
    const { data } = await supabase
      .from("athletes")
      .select("id, user_id, name, initials, note, readiness, status, weight_kg, is_private")
      .eq("club_id", clubId).not("coach_id", "is", null).order("name");
    const rows = data || [];
    const pubs = await getPublicProfiles(rows.filter(r => r.user_id).map(r => r.user_id));
    return rows.map(r => ({ ...r, photo: r.user_id ? (pubs[r.user_id]?.photo || null) : null }));
  } catch { return []; }
}

// Coach edits their club's name and/or location (Settings → Club).
export async function updateClubDetails(clubId, { name, location } = {}) {
  if (!hasSupabase || String(clubId).startsWith("local-")) return null;
  const patch = {};
  if (name != null) patch.name = name.trim();
  if (location != null) patch.location = location.trim() || null;
  if (!Object.keys(patch).length) return null;
  const { data, error } = await supabase.from("clubs").update(patch).eq("id", clubId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// Coach adds a found user (from searchUsers) to their club: insert the
// athletes row and put them in the club chat.
export async function addAthleteToClub(coachId, club, user) {
  if (!hasSupabase) throw new Error("Backend not configured.");
  if (String(club.id).startsWith("local-")) {
    throw new Error("Your club is saved on this device only for now — adding athletes unlocks once the database upgrade is applied.");
  }
  const { data: existing } = await supabase
    .from("athletes").select("id").eq("user_id", user.user_id).maybeSingle();
  if (existing) throw new Error("This athlete is already in a club.");
  const { error } = await supabase.from("athletes").insert({
    user_id: user.user_id, club_id: club.id, coach_id: coachId,
    name: user.name, initials: initialsOf(user.name), note: "New in the club",
  });
  if (error) throw new Error(error.message);
  if (club.conversation_id) {
    await supabase.from("conversation_members")
      .upsert({ conversation_id: club.conversation_id, user_id: user.user_id })
      .then(() => {}, () => {});
  }
}

export async function removeAthleteFromClub(athleteRowId) {
  if (!hasSupabase) return;
  await supabase.from("athletes").delete().eq("id", athleteRowId);
}

// Athlete-side: my membership row + club info. Null → not in a club yet.
export async function getMyClub(userId) {
  if (!hasSupabase) return null;
  try {
    const { data } = await supabase
      .from("athletes")
      .select("id, club_id, clubs(*)")
      .eq("user_id", userId).maybeSingle();
    if (!data?.clubs) return null;
    return { membershipId: data.id, club: normClub(data.clubs) };
  } catch { return null; }
}

// Search clubs by club name OR coach name. Returns club + coach + member count.
export async function findClubs(q) {
  if (!hasSupabase || !q || q.trim().length < 2) return [];
  const term = `%${q.trim()}%`;
  try {
    const [byName, coaches] = await Promise.all([
      supabase.from("clubs").select("*").ilike("name", term),
      supabase.from("coaches").select("id, name, club_id").ilike("name", term),
    ]);
    const map = new Map();
    (byName.data || []).forEach(c => map.set(c.id, normClub(c)));
    const missing = (coaches.data || []).map(c => c.club_id).filter(id => id && !map.has(id));
    if (missing.length) {
      const { data: more } = await supabase
        .from("clubs").select("*").in("id", missing);
      (more || []).forEach(c => map.set(c.id, normClub(c)));
    }
    const clubs = [...map.values()];
    const results = await Promise.all(clubs.map(async (club) => {
      const [{ count }, { data: coach }] = await Promise.all([
        supabase.from("athletes").select("id", { count: "exact", head: true }).eq("club_id", club.id).not("coach_id", "is", null),
        supabase.from("coaches").select("name").eq("club_id", club.id).maybeSingle(),
      ]);
      return { ...club, members: count || 0, coachName: coach?.name || "" };
    }));
    return results;
  } catch { return []; }
}

// Athlete joins a club: insert own athletes row + enter the club chat.
export async function joinClub(userId, profile, club) {
  if (!hasSupabase) throw new Error("Backend not configured.");
  const { data: existing } = await supabase
    .from("athletes").select("id").eq("user_id", userId).maybeSingle();
  if (existing) throw new Error("You are already in a club — leave it first.");
  const { data: coach } = await supabase
    .from("coaches").select("id").eq("club_id", club.id).maybeSingle();
  const { error } = await supabase.from("athletes").insert({
    user_id: userId, club_id: club.id, coach_id: coach?.id || null,
    name: profile.name || "Athlete", initials: initialsOf(profile.name),
    note: "New in the club", weight_kg: profile.weight || null,
  });
  if (error) throw new Error(error.message);
  if (club.conversation_id) {
    await supabase.from("conversation_members")
      .upsert({ conversation_id: club.conversation_id, user_id: userId })
      .then(() => {}, () => {});
  }
}

export async function leaveClub(userId, membershipId, conversationId) {
  if (!hasSupabase) return;
  await supabase.from("athletes").delete().eq("id", membershipId).eq("user_id", userId);
  if (conversationId) {
    await supabase.from("conversation_members")
      .delete().eq("conversation_id", conversationId).eq("user_id", userId)
      .then(() => {}, () => {});
  }
}

// Club info card data: member count + coach name.
export async function getClubInfo(clubId) {
  if (!hasSupabase || !clubId) return null;
  try {
    const [{ count }, { data: coach }, { data: club }] = await Promise.all([
      supabase.from("athletes").select("id", { count: "exact", head: true }).eq("club_id", clubId).not("coach_id", "is", null),
      supabase.from("coaches").select("name").eq("club_id", clubId).maybeSingle(),
      supabase.from("clubs").select("*").eq("id", clubId).maybeSingle(),
    ]);
    if (!club) return null;
    return { ...normClub(club), members: count || 0, coachName: coach?.name || "" };
  } catch { return null; }
}

// ── Club chat without a clubs.conversation_id column ─────────
// Until the demo-upgrade migration lands, the club's group chat is found by
// convention: a group conversation NAMED like the club, that the coach owns.
// The coach ensures it exists and keeps every club athlete in it; athletes
// find it through their own conversation membership.
export async function ensureClubConversation(coachId, clubName, memberIds = []) {
  if (!hasSupabase || !clubName) return null;
  try {
    const { data: mine } = await supabase
      .from("conversation_members").select("conversation_id").eq("user_id", coachId);
    let conv = null;
    if (mine?.length) {
      const { data: convs } = await supabase
        .from("conversations").select("id, name, type")
        .in("id", mine.map(r => r.conversation_id))
        .eq("type", "group").eq("name", clubName).limit(1);
      conv = convs?.[0] || null;
    }
    if (!conv) {
      const { data, error } = await supabase
        .from("conversations").insert({ type: "group", name: clubName, created_by: coachId })
        .select().single();
      if (error) return null;
      conv = data;
      await supabase.from("conversation_members")
        .upsert({ conversation_id: conv.id, user_id: coachId })
        .then(() => {}, () => {});
    }
    if (memberIds.length) {
      await supabase.from("conversation_members")
        .upsert(memberIds.map(uid => ({ conversation_id: conv.id, user_id: uid })))
        .then(() => {}, () => {});
    }
    return conv.id;
  } catch { return null; }
}

// Athlete side of the same convention: my group conversation named after my club.
export async function findMyClubConversation(userId, clubName) {
  if (!hasSupabase || !clubName) return null;
  try {
    const { data: mine } = await supabase
      .from("conversation_members").select("conversation_id").eq("user_id", userId);
    if (!mine?.length) return null;
    const { data: convs } = await supabase
      .from("conversations").select("id, name, type")
      .in("id", mine.map(r => r.conversation_id))
      .eq("type", "group").eq("name", clubName).limit(1);
    return convs?.[0]?.id || null;
  } catch { return null; }
}

// Change the coach's username (display name). It must stay unique — athletes
// find the club by searching this name. Persists to profiles (search) and
// coaches (club card) in one go.
export async function updateCoachName(coachId, newName) {
  const n = (newName || "").trim();
  if (!n) throw new Error("Enter a name.");
  if (!hasSupabase) return n;
  if (await isNameTaken(n).catch(() => false)) throw new Error("That username is already taken — pick another.");
  const { error } = await supabase.from("profiles")
    .upsert({ id: coachId, name: n, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await supabase.from("coaches").update({ name: n }).eq("id", coachId).then(() => {}, () => {});
  return n;
}

// ── Daily check-ins — real per-user readiness input ────────────
// A brand-new athlete has none of these: their readiness starts at 0/"no
// data yet" and only becomes real once they submit their first check-in.
// Cloud-first (per account, survives devices); localStorage is the
// device-level cache/fallback, keyed by date the same way.
const CHECKIN_LS = "athlos:checkins";
const readCheckinLS = () => { try { return JSON.parse(localStorage.getItem(CHECKIN_LS)) || {}; } catch { return {}; } };
const writeCheckinLS = (days) => { try { localStorage.setItem(CHECKIN_LS, JSON.stringify(days)); } catch {} };
const todayISO = () => new Date().toISOString().slice(0, 10);

export async function saveCheckin(userId, data, date = todayISO()) {
  const row = {
    date,
    sleep_quality: data.sleepQuality ?? null,
    mood: data.mood ?? null,
    soreness: data.soreness ?? null,
    stress: data.stress ?? null,
    sleep_h: data.sleepH ?? null,
    hydration: data.hydration ?? null,
  };
  const days = readCheckinLS();
  days[date] = row;
  writeCheckinLS(days);
  if (hasSupabase && userId) {
    try {
      await supabase.from("checkins").upsert({ user_id: userId, ...row }, { onConflict: "user_id,date" });
    } catch { /* local cache already has it */ }
  }
  return row;
}

// Last N days of check-ins, oldest first — the real history a returning
// user's readiness trend is built from. Empty array = never checked in.
export async function listCheckins(userId, days = 30) {
  if (hasSupabase && userId) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("checkins").select("*").eq("user_id", userId).gte("date", since).order("date");
      if (!error && data) return data;
    } catch { /* fall through to local */ }
  }
  const local = readCheckinLS();
  return Object.values(local).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-days);
}

export async function getTodayCheckin(userId, date = todayISO()) {
  const rows = await listCheckins(userId, 1);
  const today = rows.find((r) => r.date === date);
  if (today) return today;
  const local = readCheckinLS();
  return local[date] || null;
}

// The athlete app pushes its current readiness onto the club card so the
// coach dashboard shows live data. No-op when not in a club.
export async function syncMyClubCard(userId, { readiness, note } = {}) {
  if (!hasSupabase || readiness == null) return;
  const status = readiness >= 80 ? "ready" : readiness >= 60 ? "slightly-tired" : "tired";
  await supabase.from("athletes")
    .update({ readiness: Math.round(readiness), status, note: note || null })
    .eq("user_id", userId)
    .then(() => {}, () => {});
}

// ── Communities — public, discoverable groups ────────────────
// No local/demo backend for these (they only make sense as a shared, real
// roster) — without Supabase this returns a small read-only mock so the
// Public tab still has something to show in demo mode.
const DEMO_COMMUNITIES = [
  { id: "slovenija", slug: "slovenija", name: "Slovenija", flag: "🇸🇮", image_url: null,
    description: "Uradna Athlos skupnost za športnike iz Slovenije. Deli treninge, tekmuj na lestvicah in poveži se z lokalnimi člani.",
    members: 1, myRole: null },
  { id: "muharji", slug: "muharji", name: "Muharji", flag: null, image_url: null,
    description: null, members: 1, myRole: null },
];

// Every general-purpose communities query selects exactly these columns —
// NEVER "*". invite_code must stay admin-only (that's the whole point of a
// private community); the RLS policy is a full-row public "select true" so
// it can't enforce that itself. See get_community_invite_code() in
// schema.sql for the one legitimate way to read it.
const COMMUNITY_COLUMNS = "id, slug, name, description, sport, country, privacy, flag, image_url, cover_url, rules, weekly_challenge, created_by, created_at";

// All communities, with a live member count and (if `userId` is given) the
// caller's own role — 'admin' | 'member' | null (not joined).
export async function listCommunities(userId) {
  if (!hasSupabase) return DEMO_COMMUNITIES;
  try {
    const { data: rows, error } = await supabase.from("communities").select(COMMUNITY_COLUMNS).order("name");
    if (error || !rows) return [];
    const { data: members } = await supabase.from("community_members").select("community_id, user_id, role");
    return rows.map((c) => {
      const mine = members?.find((m) => m.community_id === c.id && m.user_id === userId);
      return {
        ...c,
        members: members?.filter((m) => m.community_id === c.id).length || 0,
        myRole: mine?.role || null,
      };
    });
  } catch { return []; }
}

// Member roster for one community — names/photos via the same public RPC
// used everywhere else (community_members itself has no profile columns,
// and `profiles` RLS only allows reading your own row directly).
export async function listCommunityMembers(communityId) {
  if (!hasSupabase) return [];
  try {
    const { data: rows, error } = await supabase
      .from("community_members").select("user_id, role, joined_at")
      .eq("community_id", communityId).order("joined_at");
    if (error || !rows) return [];
    const pubs = await getPublicProfiles(rows.map((r) => r.user_id));
    return rows.map((r) => ({ ...r, name: pubs[r.user_id]?.name || "Športnik", photo: pubs[r.user_id]?.photo || null }));
  } catch { return []; }
}

// Join a community as an ordinary member (the server-side trigger locks the
// role to 'member' regardless of what's sent — see lock_community_member_role).
export async function joinCommunity(communityId, userId) {
  if (!hasSupabase || !communityId || !userId) return;
  await supabase.from("community_members").insert({ community_id: communityId, user_id: userId }).then(() => {}, () => {});
}

export async function leaveCommunity(communityId, userId) {
  if (!hasSupabase || !communityId || !userId) return;
  await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId).then(() => {}, () => {});
}

// One community's full detail row (used by the community detail screen —
// listCommunities() already has this shape, this just fetches a single one).
export async function getCommunity(communityId, userId) {
  if (!hasSupabase) return DEMO_COMMUNITIES.find((c) => c.id === communityId) || null;
  try {
    const { data: c, error } = await supabase.from("communities").select(COMMUNITY_COLUMNS).eq("id", communityId).maybeSingle();
    if (error || !c) return null;
    const { data: members } = await supabase.from("community_members").select("user_id, role").eq("community_id", communityId);
    const mine = members?.find((m) => m.user_id === userId);
    return { ...c, members: members?.length || 0, myRole: mine?.role || null };
  } catch { return null; }
}

// Create a brand-new community — the caller becomes its admin (see
// create_community() RPC: one atomic insert + auto-admin-membership).
export async function createCommunity(userId, { name, description, sport, country, privacy, coverUrl, imageUrl, rules } = {}) {
  if (!hasSupabase || !userId || !name?.trim()) return null;
  const { data, error } = await supabase.rpc("create_community", {
    p_name: name.trim(), p_description: description || null, p_sport: sport || null, p_country: country || null,
    p_privacy: privacy === "private" ? "private" : "public",
    p_cover_url: coverUrl || null, p_image_url: imageUrl || null, p_rules: rules || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

// Join a PRIVATE community using its 6-character invite code.
export async function joinCommunityByCode(code, userId) {
  if (!hasSupabase || !userId || !code?.trim()) return null;
  const { data, error } = await supabase.rpc("join_community_by_code", { p_code: code.trim() });
  if (error) throw new Error(error.message);
  return data;
}

// The ONLY legitimate way to read a private community's invite code — the
// RPC itself checks that the caller is that community's admin, so this
// simply returns null for anyone else instead of leaking it.
export async function getCommunityInviteCode(communityId) {
  if (!hasSupabase || !communityId) return null;
  try {
    const { data } = await supabase.rpc("get_community_invite_code", { cid: communityId });
    return data || null;
  } catch { return null; }
}

// Upload a cover photo / logo / feed post image — same pattern as
// uploadChatFile, its own bucket (community-media) for a clean separation.
export async function uploadCommunityMedia(file, userId) {
  if (!hasSupabase) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("community-media").upload(path, file);
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from("community-media").getPublicUrl(path);
  return publicUrl;
}

// ── Overview stats — everything here is a real query (no invented numbers):
// total workouts logged by members, how many members trained in the last 7
// days, and the next upcoming event. ──
export async function getCommunityOverview(communityId) {
  if (!hasSupabase || !communityId) return { totalWorkouts: 0, activeMembers: 0, memberCount: 0, weeklyChallenge: null, nextEvent: null };
  try {
    const [{ data: c }, { data: members }] = await Promise.all([
      supabase.from("communities").select("weekly_challenge").eq("id", communityId).maybeSingle(),
      supabase.from("community_members").select("user_id").eq("community_id", communityId),
    ]);
    const ids = (members || []).map((m) => m.user_id);
    let totalWorkouts = 0, activeMembers = 0;
    if (ids.length) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const { data: workouts } = await supabase.from("workouts").select("user_id, date").in("user_id", ids);
      totalWorkouts = workouts?.length || 0;
      activeMembers = new Set((workouts || []).filter((w) => w.date >= since).map((w) => w.user_id)).size;
    }
    const { data: nextEvent } = await supabase
      .from("community_events").select("*").eq("community_id", communityId)
      .gte("date", new Date().toISOString().slice(0, 10)).order("date").limit(1).maybeSingle();
    return { totalWorkouts, activeMembers, memberCount: ids.length, weeklyChallenge: c?.weekly_challenge || null, nextEvent: nextEvent || null };
  } catch { return { totalWorkouts: 0, activeMembers: 0, memberCount: 0, weeklyChallenge: null, nextEvent: null }; }
}

// Weekly leaderboard — ranked by workouts actually logged in the last 7
// days. Distance/calories/strain don't exist anywhere in this app's data
// model, so this is the one metric that's real rather than invented.
export async function getCommunityLeaderboard(communityId, days = 7) {
  if (!hasSupabase || !communityId) return [];
  try {
    const { data: members } = await supabase.from("community_members").select("user_id").eq("community_id", communityId);
    const ids = (members || []).map((m) => m.user_id);
    if (!ids.length) return [];
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data: workouts } = await supabase.from("workouts").select("user_id").in("user_id", ids).gte("date", since);
    const counts = {};
    ids.forEach((id) => { counts[id] = 0; });
    (workouts || []).forEach((w) => { counts[w.user_id] = (counts[w.user_id] || 0) + 1; });
    const pubs = await getPublicProfiles(ids);
    return ids
      .map((id) => ({ user_id: id, name: pubs[id]?.name || "Športnik", photo: pubs[id]?.photo || null, workouts: counts[id] || 0 }))
      .sort((a, b) => b.workouts - a.workouts);
  } catch { return []; }
}

// ── Feed: posts, likes, comments ──────────────────────────────
// Paginated (range) — `before` is the created_at cursor of the last post
// already shown, so "load more" can page backward through history.
export async function listCommunityPosts(communityId, userId, { limit = 15, before } = {}) {
  if (!hasSupabase || !communityId) return [];
  try {
    let q = supabase.from("community_posts").select("*").eq("community_id", communityId)
      .order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data: posts, error } = await q;
    if (error || !posts?.length) return [];
    const ids = posts.map((p) => p.id);
    const [{ data: likes }, { data: comments }, pubs] = await Promise.all([
      supabase.from("community_post_likes").select("post_id, user_id").in("post_id", ids),
      supabase.from("community_post_comments").select("post_id").in("post_id", ids),
      getPublicProfiles(posts.map((p) => p.user_id)),
    ]);
    return posts.map((p) => ({
      ...p,
      name: pubs[p.user_id]?.name || "Športnik",
      photo: pubs[p.user_id]?.photo || null,
      likeCount: likes?.filter((l) => l.post_id === p.id).length || 0,
      likedByMe: !!likes?.some((l) => l.post_id === p.id && l.user_id === userId),
      commentCount: comments?.filter((c) => c.post_id === p.id).length || 0,
    }));
  } catch { return []; }
}

export async function createCommunityPost(communityId, userId, { content, imageUrl, pinned = false } = {}) {
  if (!hasSupabase || !communityId || !userId || (!content?.trim() && !imageUrl)) return null;
  const { data, error } = await supabase.from("community_posts")
    .insert({ community_id: communityId, user_id: userId, content: content?.trim() || null, image_url: imageUrl || null, pinned })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

// Authorization (own post or community admin) is enforced by RLS — the
// delete simply no-ops if the caller isn't allowed to.
export async function deleteCommunityPost(postId) {
  if (!hasSupabase) return;
  await supabase.from("community_posts").delete().eq("id", postId).then(() => {}, () => {});
}

export async function toggleCommunityPostLike(postId, userId, liked) {
  if (!hasSupabase || !postId || !userId) return;
  if (liked) await supabase.from("community_post_likes").delete().eq("post_id", postId).eq("user_id", userId).then(() => {}, () => {});
  else await supabase.from("community_post_likes").insert({ post_id: postId, user_id: userId }).then(() => {}, () => {});
}

export async function listPostComments(postId) {
  if (!hasSupabase || !postId) return [];
  try {
    const { data: rows, error } = await supabase
      .from("community_post_comments").select("*").eq("post_id", postId).order("created_at");
    if (error || !rows) return [];
    const pubs = await getPublicProfiles(rows.map((r) => r.user_id));
    return rows.map((r) => ({ ...r, name: pubs[r.user_id]?.name || "Športnik", photo: pubs[r.user_id]?.photo || null }));
  } catch { return []; }
}

export async function addPostComment(postId, userId, content) {
  if (!hasSupabase || !postId || !userId || !content?.trim()) return null;
  const { data, error } = await supabase.from("community_post_comments")
    .insert({ post_id: postId, user_id: userId, content: content.trim() }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Events ──────────────────────────────────────────────────────
export async function listCommunityEvents(communityId, userId) {
  if (!hasSupabase || !communityId) return [];
  try {
    const { data: rows, error } = await supabase
      .from("community_events").select("*").eq("community_id", communityId).order("date");
    if (error || !rows) return [];
    const ids = rows.map((r) => r.id);
    const { data: parts } = ids.length
      ? await supabase.from("community_event_participants").select("event_id, user_id").in("event_id", ids)
      : { data: [] };
    return rows.map((r) => ({
      ...r,
      participants: parts?.filter((p) => p.event_id === r.id).length || 0,
      joinedByMe: !!parts?.some((p) => p.event_id === r.id && p.user_id === userId),
    }));
  } catch { return []; }
}

export async function createCommunityEvent(communityId, userId, { title, description, date, time, location } = {}) {
  if (!hasSupabase || !communityId || !userId || !title?.trim() || !date) return null;
  const { data, error } = await supabase.from("community_events")
    .insert({ community_id: communityId, created_by: userId, title: title.trim(), description: description || null, date, time: time || "10:00", location: location || null })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function joinCommunityEvent(eventId, userId) {
  if (!hasSupabase || !eventId || !userId) return;
  await supabase.from("community_event_participants").insert({ event_id: eventId, user_id: userId }).then(() => {}, () => {});
}

export async function leaveCommunityEvent(eventId, userId) {
  if (!hasSupabase || !eventId || !userId) return;
  await supabase.from("community_event_participants").delete().eq("event_id", eventId).eq("user_id", userId).then(() => {}, () => {});
}

// ── Members directory (+ follow) ─────────────────────────────
// Weekly workout counts reuse the same real query as the leaderboard.
export async function listCommunityMembersDetailed(communityId, userId) {
  if (!hasSupabase || !communityId) return [];
  try {
    const [{ data: rows, error }, following] = await Promise.all([
      supabase.from("community_members").select("user_id, role, joined_at").eq("community_id", communityId).order("joined_at"),
      listMyFollowing(userId),
    ]);
    if (error || !rows) return [];
    const ids = rows.map((r) => r.user_id);
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const [pubs, { data: workouts }] = await Promise.all([
      getPublicProfiles(ids),
      ids.length ? supabase.from("workouts").select("user_id").in("user_id", ids).gte("date", since) : Promise.resolve({ data: [] }),
    ]);
    const followingSet = new Set(following);
    return rows.map((r) => ({
      ...r,
      name: pubs[r.user_id]?.name || "Športnik",
      photo: pubs[r.user_id]?.photo || null,
      weeklyWorkouts: workouts?.filter((w) => w.user_id === r.user_id).length || 0,
      followedByMe: followingSet.has(r.user_id),
    }));
  } catch { return []; }
}

export async function listMyFollowing(userId) {
  if (!hasSupabase || !userId) return [];
  try {
    const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
    return (data || []).map((r) => r.followee_id);
  } catch { return []; }
}

export async function followUser(followerId, followeeId) {
  if (!hasSupabase || !followerId || !followeeId || followerId === followeeId) return;
  await supabase.from("follows").insert({ follower_id: followerId, followee_id: followeeId }).then(() => {}, () => {});
}

export async function unfollowUser(followerId, followeeId) {
  if (!hasSupabase || !followerId || !followeeId) return;
  await supabase.from("follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId).then(() => {}, () => {});
}
