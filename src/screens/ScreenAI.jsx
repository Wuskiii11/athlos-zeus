import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../theme";
import { Pressable } from "../components/UI";
import {
  askAI, loadAiHistory, saveAiReply,
  loadCoachMemory, saveCoachMemory, saveCoachFeedback, addEvent,
} from "../lib/api";
import { useT } from "../lib/i18n";
import ZeusFunnel from "./ZeusFunnel";
import { offlineCoachReply, planSessions } from "../lib/coachOffline";

// Does this reply look like a weekly training plan (→ save to calendar)?
function looksLikePlan(t) {
  const s = (t || "").toLowerCase();
  const days = (s.match(/\b(ponedeljek|torek|sreda|[čc]etrtek|petek|sobota|nedelja|pon|tor|sre|pet)\b/g) || []).length;
  return days >= 2 || /teden|trening za|na[čc]rt treninga|tedenski plan/.test(s);
}

// Does the user's message ask to add a single event to the calendar?
function looksLikeSingleEventRequest(q) {
  const s = (q || "").toLowerCase();
  const hasDay = /\b(ponedeljek|torek|sreda|[čc]etrtek|petek|sobota|nedelja)\b/.test(s);
  const hasVerb = /\b(dodaj|vnesi|zabele[žz]i|shrani|postavi|zapi[šs]i)\b/.test(s);
  return hasDay && hasVerb;
}

// Extract a calendar event from a user message asking to add something on a day.
function extractSingleEvent(q) {
  const s = (q || "").toLowerCase();
  const dayMap = { "ponedeljek": 1, "torek": 2, "sreda": 3, "četrtek": 4, "cetrtek": 4, "petek": 5, "sobota": 6, "nedelja": 0 };
  for (const [word, targetDay] of Object.entries(dayMap)) {
    if (s.includes(word)) {
      const today = new Date();
      let daysUntil = (targetDay - today.getDay() + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      const d = new Date(today);
      d.setDate(today.getDate() + daysUntil);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const isGame = /tekm|igr[ao]/.test(s);
      return { date, title: isGame ? "Tekma" : "Trening", type: isGame ? "tekma" : "trening" };
    }
  }
  return null;
}

// Dates (YYYY-MM-DD) for given weekday offsets (0=Mon) in the upcoming week (from next/this Monday).
function upcomingDates(dayIndexes) {
  const today = new Date();
  const daysUntilMon = (1 - today.getDay() + 7) % 7; // 0 if today is Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMon);
  return dayIndexes.map((di) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + di);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

const SUGGESTIONS = [
  "Sestavi mi trening za ta teden",
  "Kako izboljšam regeneracijo?",
  "Imam bolečino v kolenu",
];

function AvatarIcon({ size = 36, accent, gold = "#C9A23E" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="11" fill={accent + "14"} />
      <rect x="0.5" y="0.5" width="35" height="35" rx="10.5" stroke={gold} strokeWidth="1" fill="none" opacity="0.55" />
      {/* Zeus' thunderbolt */}
      <path d="M21 6 L13.4 19.6 H18 L16 30 L23.6 16.4 H18.9 L21.7 6 Z" fill={gold} stroke={gold} strokeWidth="0.4" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function nowTime() {
  const n = new Date();
  return `${n.getHours()}:${String(n.getMinutes()).padStart(2, "0")}`;
}

// ZEUS greeting built from the learning memory — proves he "knows" the athlete.
function buildWelcome(memory, profile, fresh) {
  const name = profile?.name && profile.name !== "NIK" ? profile.name : "";
  const nm = name ? `, ${name}` : "";
  const s = (memory && memory.setup) || {};
  if (fresh) {
    const bits = [];
    if (s.goal) bits.push(`cilj ${s.goal}`);
    if (s.level) bits.push(`nivo ${s.level}`);
    if (s.seasonPhase) bits.push(`faza ${s.seasonPhase}`);
    const know = bits.length ? ` Poznam tvoj ${bits.join(", ")}.` : "";
    return `Aktiviran${nm}. Od zdaj te poznam in si te bom zapomnil.${know} Vprašaj me za prvi teden treninga — ali karkoli o treningu, prehrani in regeneraciji.`;
  }
  let g = `Spet tukaj${nm}.`;
  if (s.goal) g += ` Nadaljujeva s ciljem ${s.goal}${s.level ? ` (${s.level})` : ""}.`;
  g += " Kako gre?";
  return g;
}

// ── "Kako je šlo zadnjič?" — click feedback that feeds the learning memory ──
const PAIN_TAGS = ["Koleno", "Rama", "Spodnji hrbet", "Gleženj", "Drugje", "Brez"];
function FeedbackCard({ C, t, onSave, onSkip }) {
  const [rpe, setRpe] = useState(null);
  const [done, setDone] = useState(null);
  const [pain, setPain] = useState([]);
  const ok = rpe != null && done != null;
  const base = { fontFamily: C.display, fontSize: 13, cursor: "pointer", borderRadius: 999, transition: "all 0.15s", WebkitTapHighlightColor: "transparent" };
  const chip = (active, extra = {}) => ({ ...base, padding: "7px 12px", border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? `${C.accent}16` : C.surface, color: active ? C.accent : C.text2, fontWeight: active ? 700 : 500, ...extra });
  const togglePain = (p) =>
    setPain((arr) => p === "Brez"
      ? (arr.includes("Brez") ? [] : ["Brez"])
      : (arr.includes(p) ? arr.filter((x) => x !== p) : [...arr.filter((x) => x !== "Brez"), p]));
  const row = { fontFamily: C.display, fontSize: 12, color: C.text2, fontWeight: 600, marginBottom: 7 };
  return (
    <div style={{ alignSelf: "stretch", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 18, padding: "16px 16px 14px", margin: "2px 0", animation: "athlosMsgBot 0.32s cubic-bezier(0.22,1,0.36,1) both" }}>
      <div style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 15, color: C.text, letterSpacing: "0.02em" }}>{t("Kako je šlo zadnjič?")}</div>
      <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, marginTop: 2, marginBottom: 13 }}>{t("Da te ZEUS bolje pozna in nadgradi naslednji trening.")}</div>

      <div style={row}>{t("Napor (RPE 1–10)")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 13 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setRpe(n)} style={chip(rpe === n, { minWidth: 34, textAlign: "center", padding: "7px 0" })}>{n}</button>
        ))}
      </div>

      <div style={row}>{t("Opravljeno")}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 13 }}>
        {[["Da", true], ["Delno", "delno"], ["Ne", false]].map(([l, v]) => (
          <button key={l} onClick={() => setDone(v)} style={chip(done === v)}>{t(l)}</button>
        ))}
      </div>

      <div style={row}>{t("Bolečina")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PAIN_TAGS.map((p) => <button key={p} onClick={() => togglePain(p)} style={chip(pain.includes(p))}>{t(p)}</button>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={onSkip} style={{ background: "none", border: "none", color: C.muted, fontFamily: C.display, fontSize: 12, cursor: "pointer", letterSpacing: "0.04em" }}>{t("Preskoči")}</button>
        <Pressable
          onClick={() => ok && onSave({ rpe, completed: done !== false, pain: pain.filter((x) => x !== "Brez"), note: done === "delno" ? "delno opravljeno" : "" })}
          disabled={!ok} scale={0.96}
          style={{ background: ok ? C.btn : C.surface3, color: ok ? C.btnText : C.muted, border: "none", borderRadius: 999, padding: "11px 20px", fontFamily: C.display, fontWeight: 700, fontSize: 13 }}
        >
          {t("Shrani")}
        </Pressable>
      </div>
    </div>
  );
}

export default function ScreenAI({ user, profile }) {
  const C = useTheme();
  const t = useT();
  const [gate, setGate] = useState("loading");   // loading | funnel | chat
  const [memory, setMemory] = useState(null);
  const returningRef = useRef(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [calSaving, setCalSaving] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const chatInit = useRef(false);

  // ── Gate: load the learning memory; no setup yet → funnel, else → chat ──
  useEffect(() => {
    let alive = true;
    setGate("loading");
    chatInit.current = false;
    (async () => {
      const mem = await loadCoachMemory(user?.id);
      if (!alive) return;
      setMemory(mem);
      const hasSetup = !!(mem && mem.setup && (mem.setup.goal || mem.setup.level || mem.setup.seasonPhase));
      returningRef.current = hasSetup;
      setGate(hasSetup ? "chat" : "funnel");
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // ── Init the chat once it opens: ZEUS greeting + restore history + feedback prompt ──
  useEffect(() => {
    if (gate !== "chat" || chatInit.current) return;
    chatInit.current = true;
    const fresh = !returningRef.current;
    const welcome = { from: "bot", t: buildWelcome(memory, profile, fresh), time: nowTime() };
    setMsgs([welcome]);
    setShowSugg(fresh);
    (async () => {
      try {
        const hist = await loadAiHistory(user?.id);
        if (Array.isArray(hist) && hist.length) {
          const restored = hist.map((m) => ({
            from: m.role === "user" ? "user" : "bot",
            t: m.content,
            time: m.created_at ? new Date(m.created_at).toLocaleTimeString("sl-SI", { hour: "numeric", minute: "2-digit" }) : "",
          }));
          setMsgs([welcome, ...restored]);
          setShowSugg(false);
        }
      } catch {}
    })();
    if (returningRef.current) {
      const fb = (memory && memory.feedback) || [];
      const last = fb[fb.length - 1];
      const stale = !last || (Date.now() - new Date(last.date).getTime() > 12 * 3600 * 1000);
      if (stale) setShowFeedback(true);
    }
  }, [gate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing, showFeedback]);

  const onFunnelDone = async (setup) => {
    const mem = { ...(memory || {}), setup, onboardedAt: new Date().toISOString() };
    try { await saveCoachMemory(user?.id, mem); } catch {}
    setMemory(mem);
    returningRef.current = false;
    chatInit.current = false;
    setGate("chat");
  };

  const onSaveFeedback = async (fb) => {
    try { const mem = await saveCoachFeedback(user?.id, fb); if (mem) setMemory(mem); } catch {}
    setShowFeedback(false);
    const painTxt = fb.pain?.length ? `, bolečina: ${fb.pain.join(", ")}` : "";
    setMsgs((m) => [...m, { from: "bot", t: `Zabeležil sem (RPE ${fb.rpe}${painTxt}). To upoštevam pri naslednjem treningu. 💪`, time: nowTime() }]);
  };

  // Save this week's plan into the Koledar (season_events) — deterministic from memory.
  const saveToCalendar = async () => {
    const sessions = planSessions(memory);
    if (!sessions.length || calSaving) return;
    setCalSaving(true);
    const dates = upcomingDates(sessions.map((s) => s.dayIndex));
    try {
      for (let i = 0; i < sessions.length; i++) {
        await addEvent(user?.id, { type: "trening", title: sessions[i].title, date: dates[i], time: "17:00" });
      }
      setMsgs((m) => [...m, { from: "bot", t: `📅 Dodal sem ${sessions.length} treningov v Koledar za prihodnji teden. Najdeš jih v zavihku Koledar — uredi termine po želji.`, time: nowTime() }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", t: "Hmm, treningov nisem mogel shraniti v koledar. Poskusi še enkrat.", time: nowTime() }]);
    } finally {
      setCalSaving(false);
    }
  };

  // Memory-aware offline reply (demo mode) — ZEUS still uses goal/level/injuries/feedback.
  const demoReply = (q) => offlineCoachReply(q, memory, profile);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || typing) return;
    setShowSugg(false);
    setShowFeedback(false);
    const history = msgs.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.t }));
    setMsgs((m) => [...m, { from: "user", t: q, time: nowTime() }]);
    setInput("");
    setTyping(true);
    try {
      // Real AI via the ai-coach Edge Function (memory injected); null → local demo answers
      let finalText = await askAI(user?.id, q, history, profile || {}, memory);
      if (!finalText) { finalText = demoReply(q); saveAiReply(user?.id, finalText); }
      setMsgs((m) => [...m, { from: "bot", t: finalText, time: nowTime() }]);
      if (looksLikePlan(finalText) && memory?.setup) {
        saveToCalendar();
      } else if (looksLikeSingleEventRequest(q)) {
        const ev = extractSingleEvent(q);
        if (ev) {
          addEvent(user?.id, { type: ev.type, title: ev.title, date: ev.date, time: "17:00" })
            .then(() => setMsgs((m) => [...m, { from: "bot", t: `📅 Dodal sem "${ev.title}" v Koledar. Najdeš ga v zavihku Koledar.`, time: nowTime() }]))
            .catch(() => {});
        }
      }
    } catch {
      setMsgs((m) => [...m, { from: "bot", t: demoReply(q), time: nowTime() }]);
    } finally {
      setTyping(false);
    }
  };

  // ── Gate renders ──
  if (gate === "loading") return <div style={{ height: "100%", background: C.bg }} />;
  if (gate === "funnel") return <ZeusFunnel onDone={onFunnelDone} />;

  // ── Chat ──
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "16px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <AvatarIcon size={46} accent={C.accent} gold={C.gold} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 26, color: C.text, letterSpacing: "0.08em" }}>ZEUS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: typing ? C.gold : C.accent }} />
              <span style={{ fontFamily: C.display, fontSize: 13, fontWeight: 600, color: typing ? C.gold : C.muted, letterSpacing: "0.02em" }}>
                {typing ? t("orakelj razmišlja...") : t("ATHLOS orakelj · te pozna")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "12px 18px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "user" ? "flex-end" : "flex-start", animation: `${m.from === "user" ? "athlosMsgUser" : "athlosMsgBot"} 0.32s cubic-bezier(0.22,1,0.36,1) both` }}>
            <div style={{
              maxWidth: m.from === "user" ? "80%" : "88%", padding: "14px 16px", borderRadius: 18,
              background: m.from === "user" ? C.surface2 : C.surface, border: `1px solid ${C.border}`,
              color: m.from === "user" ? C.text : C.text2, fontFamily: C.display, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {t(m.t)}
            </div>
            <span style={{ fontFamily: C.display, fontSize: 11, color: C.muted2, marginTop: 5 }}>{m.time}</span>
          </div>
        ))}

        {/* Saving to calendar — brief inline status while the auto-save runs */}
        {calSaving && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, border: `1px solid ${C.border2}`, color: C.muted, fontFamily: C.display, fontSize: 12, animation: "athlosFade 0.2s ease" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
            📅 {t("Shranjujem v Koledar…")}
          </div>
        )}

        {/* Feedback card (returning athletes) */}
        {showFeedback && !typing && (
          <FeedbackCard C={C} t={t} onSave={onSaveFeedback} onSkip={() => setShowFeedback(false)} />
        )}

        {/* Typing dots */}
        {typing && (
          <div style={{ display: "flex", animation: "athlosFade 0.2s ease" }}>
            <div style={{ padding: "16px 18px", borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, display: "flex", gap: 6, alignItems: "center" }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: "athlosDot 1.2s infinite", animationDelay: `${d}s`, display: "block" }} />
              ))}
            </div>
          </div>
        )}

        {/* Suggestions (fresh start) */}
        {showSugg && !typing && (
          <div style={{ marginTop: 8, animation: "athlosFade 0.35s ease" }}>
            <div style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13, color: C.muted, marginBottom: 12 }}>{t("predlagana vprašanja")}</div>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} style={{
                width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                padding: "14px 16px", textAlign: "left", cursor: "pointer", marginBottom: 10,
                color: C.text2, fontFamily: C.display, fontSize: 14, lineHeight: 1.4,
                WebkitTapHighlightColor: "transparent", transition: "border-color 0.15s, color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}
                onPointerEnter={(e) => { e.currentTarget.style.borderColor = C.accent + "66"; e.currentTarget.style.color = C.text; }}
                onPointerLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
              >
                <span>{t(s)}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: "10px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 16px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 16 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("Vprašaj ZEUS-a...")}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontFamily: C.display, fontSize: 16, lineHeight: 1 }}
          />
          <Pressable
            onClick={() => send()}
            scale={0.86}
            disabled={!input.trim() || typing}
            style={{
              width: 40, height: 40, borderRadius: 999, border: "none",
              background: input.trim() && !typing ? C.accent : C.surface3,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s",
            }}
          >
            <SendIcon color={input.trim() && !typing ? "#ffffff" : C.muted} />
          </Pressable>
        </div>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <span style={{ fontFamily: C.display, fontSize: 12, color: C.muted2 }}>{t("ATHLOS AI · ni nadomestilo za zdravnika")}</span>
        </div>
      </div>
    </div>
  );
}
