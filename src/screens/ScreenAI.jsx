import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../theme";
import { Pressable, Mono, SkeletonBlock } from "../components/UI";
import { IcCalendar } from "../components/Icons";
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

// Minimal **bold** rendering — ZEUS's replies use it for emphasis, and
// showing the raw asterisks read as broken/unpolished.
function renderRich(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : <React.Fragment key={i}>{p}</React.Fragment>;
  });
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
  const base = { fontFamily: C.display, fontSize: 14.5, cursor: "pointer", borderRadius: 999, transition: "all 0.15s", WebkitTapHighlightColor: "transparent" };
  const chip = (active, extra = {}) => ({ ...base, padding: "7px 12px", border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? `${C.accent}16` : C.surface, color: active ? C.accent : C.text2, fontWeight: active ? 700 : 500, ...extra });
  const togglePain = (p) =>
    setPain((arr) => p === "Brez"
      ? (arr.includes("Brez") ? [] : ["Brez"])
      : (arr.includes(p) ? arr.filter((x) => x !== p) : [...arr.filter((x) => x !== "Brez"), p]));
  const row = { fontFamily: C.display, fontSize: 13.5, color: C.text2, fontWeight: 600, marginBottom: 7 };
  const dark = C.name === "dark";
  return (
    <div style={{
      alignSelf: "stretch", borderRadius: 18, padding: "16px 16px 14px", margin: "2px 0",
      animation: "athlosMsgBot 0.32s cubic-bezier(0.22,1,0.36,1) both",
      background: dark ? C.surface : "#FFFFFF",
      border: `1px solid ${C.gold}44`,
    }}>
      <div style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 17, color: C.text, letterSpacing: "0.02em" }}>{t("Kako je šlo zadnjič?")}</div>
      <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, marginTop: 2, marginBottom: 13 }}>{t("Da te ZEUS bolje pozna in nadgradi naslednji trening.")}</div>

      <div style={row}>{t("Napor (RPE 1–10)")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 13 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setRpe(n)} style={chip(rpe === n, { minWidth: 34, textAlign: "center", padding: "7px 0" })}><span className="at-chip-lbl" data-text={String(n)}>{n}</span></button>
        ))}
      </div>

      <div style={row}>{t("Opravljeno")}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 13 }}>
        {[["Da", true], ["Delno", "delno"], ["Ne", false]].map(([l, v]) => (
          <button key={l} onClick={() => setDone(v)} style={chip(done === v)}><span className="at-chip-lbl" data-text={t(l)}>{t(l)}</span></button>
        ))}
      </div>

      <div style={row}>{t("Bolečina")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PAIN_TAGS.map((p) => <button key={p} onClick={() => togglePain(p)} style={chip(pain.includes(p))}><span className="at-chip-lbl" data-text={t(p)}>{t(p)}</span></button>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={onSkip} style={{ background: "none", border: "none", color: C.muted, fontFamily: C.display, fontSize: 13.5, cursor: "pointer", letterSpacing: "0.04em" }}>{t("Preskoči")}</button>
        <Pressable
          onClick={() => ok && onSave({ rpe, completed: done !== false, pain: pain.filter((x) => x !== "Brez"), note: done === "delno" ? "delno opravljeno" : "" })}
          disabled={!ok} scale={0.96}
          style={{ background: ok ? C.btn : C.surface3, color: ok ? C.btnText : C.muted, border: "none", borderRadius: 999, padding: "11px 20px", fontFamily: C.display, fontWeight: 700, fontSize: 14.5 }}
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
  const dark = C.name === "dark";
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
    setMsgs((m) => [...m, { from: "bot", t: `Zabeležil sem (RPE ${fb.rpe}${painTxt}). To upoštevam pri naslednjem treningu..`, time: nowTime() }]);
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
      setMsgs((m) => [...m, { from: "bot", t: `Dodal sem ${sessions.length} treningov v Koledar za prihodnji teden. Najdeš jih v zavihku Koledar — uredi termine po želji.`, time: nowTime() }]);
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
            .then(() => setMsgs((m) => [...m, { from: "bot", t: `Dodal sem "${ev.title}" v Koledar. Najdeš ga v zavihku Koledar.`, time: nowTime() }]))
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
  if (gate === "loading") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      {/* header skeleton */}
      <div style={{ flexShrink: 0, padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <SkeletonBlock width={104} height={30} radius={8} />
        <div style={{ marginTop: 10 }}><SkeletonBlock width={190} height={12} radius={5} /></div>
      </div>
      {/* chat bubbles skeleton */}
      <div style={{ flex: 1, overflow: "hidden", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {[["l", "78%", 66], ["r", "58%", 44], ["l", "86%", 90], ["r", "48%", 40], ["l", "72%", 58]].map(([side, w, h], i) => (
          <div key={i} style={{ alignSelf: side === "r" ? "flex-end" : "flex-start", width: w }}>
            <SkeletonBlock width="100%" height={h} radius={16} />
          </div>
        ))}
      </div>
      {/* composer skeleton */}
      <div style={{ flexShrink: 0, padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
        <SkeletonBlock width="100%" height={44} radius={22} />
        <SkeletonBlock width={44} height={44} radius={999} />
      </div>
    </div>
  );
  if (gate === "funnel") return <ZeusFunnel onDone={onFunnelDone} />;

  // ── Chat ──
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, position: "relative", overflow: "hidden" }}>
      {/* Statue watermark — sits behind the whole chat (header + messages),
          the same quiet treatment as the bust watermark on Today, instead of
          a hard-edged image cropped into the header strip. */}
      <img src="/img/god-bolt.png" alt="" aria-hidden="true" style={{
        position: "absolute", top: -10, right: -70, height: 360, opacity: dark ? 0.06 : 0.05,
        filter: dark ? "invert(1)" : "none", pointerEvents: "none", userSelect: "none", zIndex: 0,
      }} />

      {/* Header — flat, calm bar. No image, no hard color edge, no kicker
          line above ZEUS. The status line doubles as the disclaimer, so
          there's no separate floating strip either. */}
      <div style={{ position: "relative", zIndex: 1, flexShrink: 0, padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: C.heading, fontWeight: 800, fontSize: 31.5, letterSpacing: "0.12em", color: C.text, lineHeight: 1 }}>ZEUS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: typing ? C.gold : C.accent2, boxShadow: typing ? "none" : `0 0 8px ${C.accent2}99`, flexShrink: 0 }} />
          <span style={{ fontFamily: C.display, fontSize: 13.5, fontWeight: 600, color: typing ? C.gold : C.muted }}>
            {typing ? t("razmišlja…") : t("ATHLOS AI · ni nadomestilo za zdravnika")}
          </span>
        </div>
      </div>

      {/* Messages — the same marble dialogue as human chat: ZEUS speaks in
          italic Cormorant on a marble tablet, your replies are engraved ink
          panels with a faint green "oracle" breath, like an answered oracle. */}
      <div ref={scrollRef} style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "12px 18px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.map((m, i) => {
          const isMine = m.from === "user";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", animation: `${isMine ? "athlosMsgUser" : "athlosMsgBot"} 0.32s cubic-bezier(0.22,1,0.36,1) both` }}>
              <div style={{
                position: "relative", maxWidth: isMine ? "80%" : "88%", padding: "14px 16px", overflow: "hidden",
                borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMine
                  ? "#1C1814"
                  : (dark ? "rgba(255,255,255,0.07)" : "#FFFFFF"),
                border: isMine
                  ? "1px solid rgba(244,239,230,0.10)"
                  : `1px solid ${dark ? "rgba(255,255,255,0.10)" : "#D8CFBD"}`,
                boxShadow: isMine ? "0 6px 16px rgba(28,24,20,0.18)" : (dark ? "none" : "0 3px 10px rgba(28,24,20,0.05)"),
              }}>
                <span style={{
                  position: "relative", fontFamily: C.display, fontWeight: 500, fontSize: 17.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
                  fontStyle: isMine ? "normal" : "italic",
                  color: isMine ? "#F4EFE6" : C.text,
                }}>
                  {renderRich(t(m.t))}
                </span>
              </div>
              <Mono style={{ fontSize: 9, color: C.muted2, marginTop: 5, letterSpacing: "0.1em" }}>{m.time}</Mono>
            </div>
          );
        })}

        {/* Saving to calendar — brief inline status while the auto-save runs */}
        {calSaving && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, border: `1px solid ${C.border2}`, color: C.muted, fontFamily: C.display, fontSize: 13.5, animation: "athlosFade 0.2s ease" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
            <span style={{ display: "flex", color: C.gold }}><IcCalendar size={13} /></span> {t("Shranjujem v Koledar…")}
          </div>
        )}

        {/* Feedback card (returning athletes) */}
        {showFeedback && !typing && (
          <FeedbackCard C={C} t={t} onSave={onSaveFeedback} onSkip={() => setShowFeedback(false)} />
        )}

        {/* Typing dots — same marble tablet as a ZEUS reply */}
        {typing && (
          <div style={{ display: "flex", animation: "athlosFade 0.2s ease" }}>
            <div style={{
              padding: "16px 18px", borderRadius: "18px 18px 18px 4px", display: "flex", gap: 6, alignItems: "center",
              background: dark ? "rgba(255,255,255,0.07)" : "#FFFFFF",
              border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "#D8CFBD"}`,
            }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, animation: "athlosDot 1.2s infinite", animationDelay: `${d}s`, display: "block" }} />
              ))}
            </div>
          </div>
        )}

        {/* Suggestions (fresh start) — marble tablets, matching the chat list */}
        {showSugg && !typing && (
          <div style={{ marginTop: 8, animation: "athlosFade 0.35s ease" }}>
            <Mono style={{ color: C.gold, fontSize: 10, letterSpacing: "0.14em", display: "block", marginBottom: 12 }}>{t("predlagana vprašanja")}</Mono>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} style={{
                width: "100%",
                background: dark ? C.surface : "#FFFFFF",
                border: `1px solid ${dark ? C.border : "#D8CFBD"}`,
                borderRadius: 16,
                padding: "14px 16px", textAlign: "left", cursor: "pointer", marginBottom: 10,
                color: C.text2, fontFamily: C.display, fontSize: 17, fontStyle: "italic", lineHeight: 1.4,
                WebkitTapHighlightColor: "transparent", transition: "border-color 0.15s, color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}
                onPointerEnter={(e) => { e.currentTarget.style.borderColor = C.gold + "88"; e.currentTarget.style.color = C.text; }}
                onPointerLeave={(e) => { e.currentTarget.style.borderColor = dark ? C.border : "#D8CFBD"; e.currentTarget.style.color = C.text2; }}
              >
                <span>{t(s)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input — same serif-on-marble composer as human chat, ink send button
          with the signature electric-green arrow */}
      <div style={{ position: "relative", zIndex: 1, flexShrink: 0, padding: "10px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 16px", background: dark ? C.surface2 : "rgba(255,255,255,0.55)", border: `1px solid ${dark ? C.border : "#D8CFBD"}`, borderRadius: 16 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("Vprašaj ZEUS-a...")}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontFamily: C.display, fontWeight: 500, fontSize: 18, lineHeight: 1 }}
          />
          <Pressable
            onClick={() => send()}
            scale={0.86}
            disabled={!input.trim() || typing}
            style={{
              width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(244,239,230,0.12)",
              background: "#1C1814",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: input.trim() && !typing ? 1 : 0.4,
              boxShadow: input.trim() && !typing ? "0 6px 16px rgba(28,24,20,0.28)" : "none",
              transition: "opacity 0.2s, box-shadow 0.2s",
            }}
          >
            <SendIcon color={input.trim() && !typing ? C.accent2 : "rgba(244,239,230,0.6)"} />
          </Pressable>
        </div>
      </div>
    </div>
  );
}
