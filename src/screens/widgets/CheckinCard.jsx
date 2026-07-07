import React, { useState } from "react";
import { Mono } from "../../components/UI";
import { IcFlame } from "../../components/Icons";

// Per spec (ATHLOS-dodatki-spec.pdf, §04 · Wellness check-in):
// A morning questionnaire card at the top of the home screen. 4 questions on
// a 1–5 scale feed straight into the readiness battery. Once submitted the
// questionnaire disappears for the day and only a slim streak strip remains —
// a Duolingo-style 🔥 counter with the current week's dots (P T S Č P S N).
// Missing a day resets the streak to 0.
const STORE_KEY = "athlos:wellness";

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const loadWellness = () => {
  try { return { days: {}, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; }
  catch { return { days: {} }; }
};
const saveWellness = (s) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} };

// Consecutive days ending today (or yesterday, when today isn't done yet —
// the streak isn't lost until the day is actually missed).
export function computeStreak(days, now = new Date()) {
  const d = new Date(now);
  if (!days[isoLocal(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[isoLocal(d)]) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

// Monday-first week of `now`: [{label, iso, done, isToday}]
function weekDots(days, now = new Date(), lang = "sl") {
  const labels = lang === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["P", "T", "S", "Č", "P", "S", "N"];
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = isoLocal(d);
    return { label, iso, done: !!days[iso], isToday: iso === isoLocal(now) };
  });
}

const QUESTIONS = [
  { key: "sleepQuality", label: "Kako si spal?" },
  { key: "soreness", label: "Bolečine, mišična napetost?" },
  { key: "stress", label: "Stres / razpoloženje?" },
  { key: "mood", label: "Energija danes?" },
];

function ScaleRow({ q, value, onPick, C, t }) {
  return (
    <div>
      <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text, display: "block", marginBottom: 7 }}>{t(q.label)}</span>
      <div style={{ display: "flex", gap: 7 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onPick(n)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${value === n ? C.accent : C.border2}`,
            background: value === n ? `${C.accent}1f` : "transparent",
            color: value === n ? C.accent : C.muted,
            fontFamily: C.mono, fontWeight: 700, fontSize: 14.5, WebkitTapHighlightColor: "transparent",
          }}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function StreakStrip({ days, C, t, lang, style }) {
  const streak = computeStreak(days);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex", color: streak > 0 ? C.gold : C.muted2 }}><IcFlame size={19} /></span>
        <span style={{ fontFamily: C.heading, fontWeight: 800, fontSize: 24.5, color: C.text, lineHeight: 1 }}>{streak}</span>
        <Mono style={{ color: C.muted, fontSize: 9, letterSpacing: "0.1em" }}>{t("DNI ZAPORED · STREAK")}</Mono>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {weekDots(days, new Date(), lang).map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Mono style={{ color: d.isToday ? C.text : C.muted2, fontSize: 9 }}>{d.label}</Mono>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: d.done ? C.accent : "transparent",
              border: `1px solid ${d.done ? C.accent : C.border2}`,
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CheckinCard({ C, t, lang, onSubmit }) {
  const [store, setStore] = useState(loadWellness);
  const [answers, setAnswers] = useState({});
  const today = isoLocal(new Date());
  const doneToday = !!store.days[today];

  // Done for today → questionnaire is gone, only the streak strip stays.
  if (doneToday) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "14px 18px", marginBottom: 12 }}>
        <StreakStrip days={store.days} C={C} t={t} lang={lang} />
      </div>
    );
  }

  const complete = QUESTIONS.every((q) => answers[q.key]);

  const submit = () => {
    if (!complete) return;
    const next = { ...store, days: { ...store.days, [today]: { ...answers, at: Date.now() } } };
    setStore(next);
    saveWellness(next);
    onSubmit?.(answers);
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 18, marginBottom: 12 }}>
      {/* icon-chip header row, matching the rest of the home cards */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5s1.2 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 10h.01M15 10h.01" /></svg>
        </span>
        <span style={{ flex: 1, fontFamily: C.display, fontWeight: 700, fontSize: 16, color: C.text }}>{t("Kako se počutiš?")}</span>
        <Mono style={{ color: C.accent, fontSize: 9, letterSpacing: "0.1em" }}>{t("JUTRANJI CHECK-IN")}</Mono>
      </div>

      <StreakStrip days={store.days} C={C} t={t} lang={lang} style={{ paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {QUESTIONS.map((q) => (
          <ScaleRow key={q.key} q={q} value={answers[q.key]} onPick={(n) => setAnswers((a) => ({ ...a, [q.key]: n }))} C={C} t={t} />
        ))}
      </div>

      <button onClick={submit} disabled={!complete} style={{
        width: "100%", marginTop: 16, padding: "15px 0", borderRadius: 999, border: "none",
        cursor: complete ? "pointer" : "default",
        background: complete ? C.btn : C.surface3, color: complete ? C.btnText : C.muted,
        fontFamily: C.display, fontWeight: 700, fontSize: 15,
        transition: "background 0.2s, color 0.2s", WebkitTapHighlightColor: "transparent",
      }}>
        {t("Pošlji & posodobi readiness")} <span style={{ color: complete ? C.accent2 : C.muted2 }}>→</span>
      </button>
    </div>
  );
}
