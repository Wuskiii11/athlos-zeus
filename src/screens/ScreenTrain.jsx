import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../theme";
import { Mono, BackBtn, Pressable } from "../components/UI";
import { saveWorkout, completeTodaysTraining } from "../lib/api";
import { useT } from "../lib/i18n";
import { getLive, setLive, clearLive } from "../lib/liveSession";
import LockscreenDemo from "./widgets/LockscreenDemo";

/* ───────────────────────── helpers ───────────────────────── */
function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/* Session model (mirrors the design mockups: warm-up → super-set A → cool-down) */
const SESSION = {
  no: 1,
  focus: "MOČ · SPODNJI DEL",
  when: "SRE · 04 JUN · 18:30",
  rounds: 3,
  rest: 90,
  stats: { time: "62", intens: "82", volume: "8.6", kcal: "480" },
  warmup: { name: "Ogrevanje", info: "5 vaj · 8 min" },
  cooldown: { name: "Ohlajanje", info: "4 koraki · 7 min" },
  block: [
    { block: "A1", cat: "GLAVNI DVIG", name: "Počep", tag: "VBT", reps: 5, load: 120, unit: "KG", sets: 4, chart: true },
    { block: "A2", cat: "EKSPLOZIVNOST", name: "Skok na zaboj", reps: 3, load: 60, unit: "CM", sets: 3 },
    { block: "A3", cat: "STABILNOST", name: "Köbenhavnska deska", reps: 30, load: 0, unit: "S", sets: 3 },
  ],
};

/* ───────────────────────── reps slider ───────────────────────── */
function RepsSlider({ value, max, onChange, accent, track, dim }) {
  const ref = useRef(null);
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const setFromX = (clientX) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round(f * max));
  };
  return (
    <div
      ref={ref}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setFromX(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) setFromX(e.clientX); }}
      style={{ position: "relative", height: 34, borderRadius: 10, background: track, cursor: "pointer", touchAction: "none", overflow: "hidden", userSelect: "none" }}
    >
      <div style={{ position: "absolute", inset: 0, width: `${pct * 100}%`, background: `${accent}33`, borderRadius: 10, transition: "width 0.08s linear" }} />
      <div style={{ position: "absolute", top: "50%", left: `calc(${pct * 100}% )`, transform: "translate(-50%,-50%)", width: 30, height: 26, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.22)", color: "#ffffff", fontWeight: 800, fontSize: 13.5, pointerEvents: "none" }}>
        ‹›
      </div>
    </div>
  );
}

/* ───────────────────────── load stepper ───────────────────────── */
function LoadStepper({ value, unit, onChange, C, step = 2.5 }) {
  const btn = { width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.border2}`, background: C.surface2, color: C.text, fontSize: 22.5, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={() => onChange(Math.max(0, +(value - step).toFixed(1)))} style={btn}>−</button>
      <div style={{ flex: 1, textAlign: "center" }}>
        <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 24.5, color: C.text }}>{value}</span>
        <span style={{ fontFamily: C.mono, fontSize: 12.5, color: C.muted, marginLeft: 4 }}>{unit}</span>
      </div>
      <button onClick={() => onChange(+(value + step).toFixed(1))} style={{ ...btn, color: C.accent, borderColor: `${C.accent}66` }}>+</button>
    </div>
  );
}

/* ───────────────────────── progression chart ───────────────────────── */
function Progression({ C, t }) {
  const W = 300, H = 120, pad = 6;
  const load = [38, 44, 50, 58, 66, 78, 92, 110];
  const vel = [108, 100, 92, 86, 74, 64, 52, 40];
  const toPts = (arr) => arr.map((v, i) => {
    const x = pad + (i / (arr.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - 30) / 90) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <Mono style={{ color: C.muted, fontSize: 10 }}>{t("NAPREDEK · 8 TEDNOV")}</Mono>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 19, color: C.text, letterSpacing: "-0.01em", marginTop: 2 }}>{t("OBREMENITEV & HITROST")}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div><span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: C.accent }}>120</span><span style={{ fontFamily: C.mono, fontSize: 10, color: C.muted }}> KG</span> <span style={{ fontFamily: C.mono, fontSize: 10, color: C.accent }}>+20%</span></div>
          <div><span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: C.text }}>0.58</span><span style={{ fontFamily: C.mono, fontSize: 10, color: C.muted }}> M/S {t("HITR.")}</span></div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="120" style={{ display: "block" }}>
        <polyline points={toPts(load)} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={toPts(vel)} fill="none" stroke={`${C.accent}80`} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
        <circle cx={W - pad} cy={pad + (1 - (load[7] - 30) / 90) * (H - pad * 2)} r="4" fill={C.accent} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <Mono style={{ color: C.muted2, fontSize: 9 }}>T-7</Mono>
        <Mono style={{ color: C.muted2, fontSize: 9 }}>T-4</Mono>
        <Mono style={{ color: C.accent, fontSize: 9 }}>{t("ZDAJ")}</Mono>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 2, background: C.accent }} /><Mono style={{ color: C.muted, fontSize: 9 }}>{t("Obremenitev · kg")}</Mono></span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 0, borderTop: `2px dashed ${C.accent}80` }} /><Mono style={{ color: C.muted, fontSize: 9 }}>{t("Hitrost · m/s")}</Mono></span>
      </div>
    </div>
  );
}

/* ───────────────────────── VBT sheet ───────────────────────── */
const VBT_HISTORY = [
  { label: "T1",    kg: 100,   reps: 5, vbt: false },
  { label: "T2",    kg: 107.5, reps: 5, vbt: false },
  { label: "T3",    kg: 112.5, reps: 5, vbt: false },
  { label: "T4",    kg: 117.5, reps: 5, vbt: false },
  { label: "DANES", kg: 120,   reps: 5, vbt: true, vel: "0.58 m/s" },
];

const VBT_TODAY_SETS = [
  { num: 1, label: "Set 1", sub: "OGREVALNI",              kg: 100, reps: 5, top: false },
  { num: 2, label: "Set 2", sub: "DELOVNI",                kg: 115, reps: 3, top: false },
  { num: 3, label: "Set 3", sub: "NAJVIŠJA – VBT POSNETO", kg: 130, reps: 3, top: true  },
];

function VBTSheet({ ex, C, t, onClose, onStart }) {
  const data = VBT_HISTORY;
  const W = 320, H = 170;
  const padL = 36, padR = 14, padT = 14, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const yMin = 93, yMax = 133;
  const gridKgs = [130, 120, 110, 100];

  const mx = (i) => padL + (i / (data.length - 1)) * plotW;
  const my = (kg) => padT + (1 - (kg - yMin) / (yMax - yMin)) * plotH;
  const linePts = data.map((d, i) => `${mx(i).toFixed(1)},${my(d.kg).toFixed(1)}`).join(" ");
  const areaPts = `${padL},${padT + plotH} ${linePts} ${mx(data.length - 1).toFixed(1)},${padT + plotH}`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20, background: C.bg, display: "flex", flexDirection: "column", animation: "athlosFade 0.2s ease" }}>
      {/* header */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>←</button>
        <div style={{ flex: 1 }}>
          <Mono style={{ color: C.muted, fontSize: 10 }}>{ex.block} · {t("VAJA V TRENINGU")}</Mono>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 22.5, color: C.text, marginTop: 2 }}>{t(ex.name)}</div>
          <Mono style={{ color: C.accent, fontSize: 10, marginTop: 2 }}>{ex.reps} {t("PON.")} · {t("NAPREDOVANJE 4 TEDNI")}</Mono>
        </div>
        <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: C.accent, border: `1px solid ${C.accent}55`, borderRadius: 5, padding: "2px 6px" }}>{ex.tag}</span>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 20px" }}>
        {/* chart card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "16px 14px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text }}>{t("Napredovanje")} · {t("teža")}</span>
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>kg / {t("čas")}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ display: "block" }}>
            {/* horizontal grid */}
            {gridKgs.map((kg) => (
              <g key={kg}>
                <line x1={padL} y1={my(kg)} x2={padL + plotW} y2={my(kg)} stroke={C.border} strokeWidth="0.8" strokeDasharray="3 5" />
                <text x={padL - 4} y={my(kg) + 3} fontSize="8" fill={C.muted2} textAnchor="end" fontFamily="monospace">{kg}</text>
              </g>
            ))}
            {/* area fill */}
            <polygon points={areaPts} fill={`${C.accent}10`} />
            {/* line */}
            <polyline points={linePts} fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {/* dots + x labels */}
            {data.map((d, i) => {
              const cx = mx(i), cy = my(d.kg);
              const isLast = i === data.length - 1;
              return (
                <g key={i}>
                  {isLast
                    ? <circle cx={cx} cy={cy} r="7.5" fill={C.accent} />
                    : <circle cx={cx} cy={cy} r="5" fill={C.bg} stroke={C.accent} strokeWidth="1.8" />}
                  <text x={cx} y={padT + plotH + 18} fontSize="8" fill={isLast ? C.accent : C.muted2} textAnchor="middle" fontFamily="monospace" fontWeight={isLast ? "700" : "400"}>{d.label}</text>
                </g>
              );
            })}
          </svg>
          {/* legend */}
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill={C.bg} stroke={C.accent} strokeWidth="1.5" /></svg>
              <Mono style={{ color: C.muted, fontSize: 9 }}>{t("brez snemanja")}</Mono>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill={C.accent} /></svg>
              <Mono style={{ color: C.muted, fontSize: 9 }}>VBT · {t("zadnji set")}</Mono>
            </div>
          </div>
        </div>

        {/* today's sets */}
        <Mono style={{ color: C.muted, fontSize: 10, letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>{t("DANES")} · {VBT_TODAY_SETS.length} {t("SERIJE")}</Mono>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 8 }}>
          {VBT_TODAY_SETS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < VBT_TODAY_SETS.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: s.top ? C.accent : C.surface2, color: s.top ? "#fff" : C.text2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontWeight: 700, fontSize: 13.5, flexShrink: 0 }}>{s.num}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text }}>{s.label}</div>
                <Mono style={{ color: C.muted, fontSize: 10 }}>{t(s.sub)}</Mono>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 17, color: s.top ? C.accent : C.text }}>{s.kg} × {s.reps}</span>
                {s.top && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF4B4B", flexShrink: 0 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "14px 18px", paddingBottom: "max(18px, env(safe-area-inset-bottom, 18px))", borderTop: `1px solid ${C.border}` }}>
        <button onClick={onStart} style={{ width: "100%", padding: "17px", borderRadius: 999, border: "none", background: C.btn, color: C.btnText, fontFamily: C.display, fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: C.glow, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
          {t("ZAČNI VAJO")} · {t(ex.name)}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════ screen ═══════════════════════════ */
export default function ScreenTrain({ go, user }) {
  const C = useTheme();
  const t = useT();
  // Resume a running session from the live store (spec §07) — the component
  // unmounts when the user switches tabs; the store keeps the workout alive.
  const resume = useRef(getLive()).current;
  const [started, setStarted] = useState(!!resume);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(resume?.startedAt || null);
  const [elapsed, setElapsed] = useState(resume ? Math.floor((Date.now() - resume.startedAt) / 1000) : 0);
  const [exIdx, setExIdx] = useState(resume?.exIdx || 0);
  // per-exercise set logs: { reps, load, done }[]
  const [logs, setLogs] = useState(() =>
    resume?.logs || SESSION.block.map((e) => Array.from({ length: e.sets }, () => ({ reps: 0, load: e.load, done: false })))
  );
  const [slide, setSlide] = useState(0); // slide-to-start progress 0..1
  const [vbtEx, setVbtEx] = useState(null); // index of exercise showing VBT sheet, or null
  const [lockDemo, setLockDemo] = useState(false); // mock lockscreen overlay (spec §07)

  // Pause actually stops the clock; on resume the start epoch shifts forward
  // by the paused span, so wall-clock consumers (live bar, resume-from-store)
  // agree with the on-screen total.
  const [paused, setPaused] = useState(false);
  const pausedAt = useRef(null);

  useEffect(() => {
    if (!started || finished || paused) return;
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [started, finished, paused]);

  const togglePause = () => {
    setPaused((p) => {
      if (!p) {
        pausedAt.current = Date.now();
        setLive({ paused: true });
      } else if (pausedAt.current && startedAt.current) {
        startedAt.current += Date.now() - pausedAt.current;
        pausedAt.current = null;
        setLive({ startedAt: startedAt.current, paused: false });
      }
      return !p;
    });
  };

  const ex = SESSION.block[exIdx];
  const exLogs = logs[exIdx];
  const doneCount = exLogs.filter((s) => s.done).length;

  // Publish the workout state for the cross-tab live bar + lockscreen demo.
  useEffect(() => {
    if (!started || finished) return;
    if (!startedAt.current) startedAt.current = Date.now();
    const active = exLogs.find((x) => !x.done) || exLogs[exLogs.length - 1];
    setLive({
      focus: SESSION.focus, block: ex.block, exName: ex.name,
      setDone: doneCount, setsTotal: exLogs.length,
      reps: ex.reps, load: active?.load || 0, unit: ex.unit,
      nextName: SESSION.block[exIdx + 1]?.name || null,
      startedAt: startedAt.current, exIdx, logs,
    });
  }, [started, finished, exIdx, logs]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLog = (si, patch) => {
    // marking a set done starts the between-set rest countdown (spec §07)
    if (patch.done) setLive({ resting: true, restUntil: Date.now() + SESSION.rest * 1000 });
    setLogs((all) => all.map((arr, i) => (i === exIdx ? arr.map((s, j) => (j === si ? { ...s, ...patch } : s)) : arr)));
  };

  const addSet = () =>
    setLogs((all) => all.map((arr, i) => (i === exIdx ? [...arr, { reps: 0, load: ex.load, done: false }] : arr)));

  const finishSession = () => {
    setFinished(true);
    clearLive();
    startedAt.current = null;
    saveWorkout(user?.id, {
      title: `Trening ${SESSION.no} · ${SESSION.focus}`,
      durationSec: elapsed,
      setsDone: logs.reduce((s, arr) => s + arr.filter((x) => x.done).length, 0),
      exercises: SESSION.block.map((e, i) => ({ name: e.name, sets: logs[i].length, reps: e.reps })),
    }).catch(() => {});
    completeTodaysTraining(user?.id).catch(() => {});
  };

  const nextExercise = () => {
    if (exIdx >= SESSION.block.length - 1) return finishSession();
    setExIdx((i) => i + 1);
  };

  /* ───────── overview (mockup 2) ───────── */
  if (!started) {
    return (
      <div style={{ padding: "8px 18px 28px" }}>
        {/* header */}
        <div style={{ marginBottom: 20 }}>
          <Mono style={{ color: C.muted, fontSize: 10 }}>{t(SESSION.when)}</Mono>
          <h1 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 33.5, margin: "6px 0 2px", color: C.text, letterSpacing: "-0.02em" }}>{t("TRENING")} {SESSION.no}</h1>
          <Mono style={{ color: C.accent, fontSize: 12.5, letterSpacing: "0.12em" }}>{t(SESSION.focus)}</Mono>
        </div>

        {/* overview card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <Mono style={{ color: C.muted, fontSize: 10 }}>{t("PREGLED TRENINGA")}</Mono>
              <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 20, color: C.text, marginTop: 2 }}>3 {t("BLOKI")} · 9 {t("VAJ")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: `${C.accent}1a`, border: `1px solid ${C.accent}40` }}>
              <svg width="16" height="10" viewBox="0 0 26 14" fill="none"><rect x="0.5" y="0.5" width="22" height="13" rx="3" stroke={C.accent} /><rect x="23" y="4" width="2.5" height="6" rx="1" fill={C.accent} /><rect x="2" y="2" width="16" height="10" rx="1.5" fill={C.accent} /></svg>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 12.5, color: C.accent }}>84%</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[[SESSION.stats.time, t("MIN"), C.text], [SESSION.stats.intens + "%", t("INTENZ."), C.accent], [SESSION.stats.volume + t(" T"), t("VOLUMEN"), C.text], ["~" + SESSION.stats.kcal, t("KCAL"), C.text]].map(([v, l, col], i) => (
              <div key={i}>
                <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 21.5, color: col }}>{v}</div>
                <Mono style={{ color: C.muted, fontSize: 9 }}>{l}</Mono>
              </div>
            ))}
          </div>
        </div>

        {/* warm up */}
        <BlockCard C={C} onClick={() => setStarted(true)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill={C.yellow}><path d="M12 2c1 3-1 4-1 6a3 3 0 006 0c0-1 0-2-1-3 3 2 5 5 5 9a9 9 0 11-18 0c0-4 3-7 6-9 0 2 2 3 4 3-2-2-1-4 0-6z" /></svg>}
          iconBg={`${C.yellow}1f`} title={t("Ogrevanje")} info={t("5 vaj · 8 min")} />

        {/* super set A */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 2px 10px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.accent }} />
            <Mono style={{ color: C.text, fontSize: 12.5, letterSpacing: "0.12em" }}>{t("SUPER SERIJA A")}</Mono>
          </span>
          <Mono style={{ color: C.muted, fontSize: 10 }}>{SESSION.rounds} {t("KROGI")} · {SESSION.rest}s {t("ODMOR")}</Mono>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "6px 16px", marginBottom: 16, position: "relative" }}>
          {SESSION.block.map((e, i) => (
            <button key={i} onClick={() => { if (e.chart || e.tag === "VBT") { setVbtEx(i); } else { setStarted(true); setExIdx(i); } }}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: i < SESSION.block.length - 1 ? `1px solid ${C.border}` : "none", padding: "16px 0", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
              <span style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontWeight: 700, fontSize: 12.5, color: C.accent, background: C.bg }}>{e.block}</span>
                {i < SESSION.block.length - 1 && <span style={{ position: "absolute", top: 34, left: "50%", width: 1, height: 28, background: C.border2, transform: "translateX(-50%)" }} />}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>{t(e.name)}</span>
                  {e.tag && <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: C.accent, border: `1px solid ${C.accent}55`, borderRadius: 5, padding: "1px 5px", letterSpacing: "0.08em" }}>{e.tag}</span>}
                </span>
                <Mono style={{ color: C.muted, fontSize: 11 }}>{e.reps} {t("pon.")} · {e.load > 0 ? `${e.load} ${e.unit.toLowerCase()}` : `${e.reps} ${e.unit.toLowerCase()} / ${t("stran")}`}</Mono>
              </span>
              <span style={{ color: C.muted }}>›</span>
            </button>
          ))}
        </div>

        {/* cool down */}
        <BlockCard C={C} onClick={() => setStarted(true)}
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.9z" /></svg>}
          iconBg={`${C.accent}1a`} title={t("Ohlajanje")} info={t("4 koraki · 7 min")} />

        {/* VBT sheet overlay */}
        {vbtEx !== null && (
          <VBTSheet ex={SESSION.block[vbtEx]} C={C} t={t} onClose={() => setVbtEx(null)} onStart={() => { setVbtEx(null); setStarted(true); setExIdx(vbtEx); }} />
        )}

        {/* slide to start */}
        <div style={{ marginTop: 22 }}>
          {/* dimmed green on dark (no neon, no glow) — quiet flat shadow */}
          <div style={{ position: "relative", height: 58, borderRadius: 999, background: C.name === "dark" ? "#00B368" : C.accent, overflow: "hidden", boxShadow: "0 3px 12px rgba(0,0,0,0.25)" }}>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontWeight: 800, fontSize: 17, color: "#ffffff", letterSpacing: "0.04em", opacity: 1 - slide }}>
              {t("POVLECI ZA ZAČETEK")} →
            </span>
            <div
              onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
              onPointerMove={(e) => {
                if (!e.buttons) return;
                const r = e.currentTarget.parentElement.getBoundingClientRect();
                setSlide(Math.max(0, Math.min(1, (e.clientX - r.left - 29) / (r.width - 58))));
              }}
              onPointerUp={() => { if (slide > 0.7) setStarted(true); else setSlide(0); }}
              style={{ position: "absolute", top: 5, left: `calc(5px + ${slide} * (100% - 58px))`, width: 48, height: 48, borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", touchAction: "none", boxShadow: "0 2px 8px rgba(14,27,42,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={C.accent}><path d="M5 3l14 9-14 9V3z" /></svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───────── completion ───────── */
  if (finished) {
    return (
      <div style={{ padding: "8px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", animation: "athlosFade 0.3s ease" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: `${C.accent}1a`, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, boxShadow: C.name === "dark" ? `0 0 34px ${C.accent}44` : "none" }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 29, margin: "0 0 8px", color: C.text, letterSpacing: "-0.02em" }}>{t("Trening končan!")}</h2>
        <Mono style={{ color: C.muted, fontSize: 11, marginBottom: 28 }}>{t("SHRANJENO V TVOJO ZGODOVINO")}</Mono>
        <div style={{ display: "flex", gap: 24, marginBottom: 34 }}>
          {[[fmtTime(elapsed), t("čas")], [String(logs.reduce((s, a) => s + a.filter((x) => x.done).length, 0)), t("serij")], [String(SESSION.block.length), t("vaj")]].map(([v, l], i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 27, color: C.text }}>{v}</div>
              <Mono style={{ color: C.muted, fontSize: 10 }}>{l}</Mono>
            </div>
          ))}
        </div>
        <Pressable onClick={() => { setStarted(false); setFinished(false); setElapsed(0); setExIdx(0); go("today"); }} style={{ width: "100%", padding: "17px", borderRadius: 999, border: "none", background: C.btn, color: C.btnText, fontFamily: C.display, fontWeight: 700, fontSize: 17 }}>
          {t("Nazaj na pregled")}
        </Pressable>
      </div>
    );
  }

  /* ───────── active session (mockups 1 & 3) ───────── */
  return (
    <div style={{ padding: "8px 18px 28px" }}>
      {/* header — compact controls row first, then the full-width title, so
          the kicker doesn't wrap in a squeezed column next to the timer */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <BackBtn onClick={() => setStarted(false)} />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* mock lockscreen Live Activity demo (spec §07) */}
          <button onClick={() => setLockDemo(true)} aria-label="Live Activity demo" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${C.border2}`, background: "transparent", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: C.surface, border: `1px solid ${paused ? C.border2 : `${C.accent}55`}`, borderRadius: 14 }}>
            <button onClick={togglePause} aria-label={paused ? t("Nadaljuj") : t("Pavza")} style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${paused ? C.muted : C.accent}`, background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
              {paused
                ? <svg width="9" height="9" viewBox="0 0 24 24" fill={C.muted} style={{ marginLeft: 2 }}><path d="M5 3l14 9-14 9V3z" /></svg>
                : <svg width="9" height="9" viewBox="0 0 24 24" fill={C.accent}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>}
            </button>
            <div><Mono style={{ color: C.muted, fontSize: 9 }}>{paused ? t("PAVZA") : t("PRETEČENO")}</Mono><div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 15.5, color: paused ? C.muted : C.accent }}>{fmtTime(elapsed)}</div></div>
          </div>
        </div>
      </div>

      {/* exercise title — full width under the controls */}
      <div style={{ marginBottom: 16 }}>
        <Mono style={{ color: C.accent, fontSize: 10, letterSpacing: "0.1em" }}>{t("TRENING")} {SESSION.no} · {ex.block} · {t(ex.cat)}</Mono>
        <h1 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 29, margin: "4px 0 0", color: C.text, letterSpacing: "-0.02em", textTransform: "uppercase" }}>{t(ex.name)}</h1>
      </div>

      {lockDemo && <LockscreenDemo t={t} onClose={() => setLockDemo(false)} />}

      {/* progression chart (only for the main lift) */}
      {ex.chart && <Progression C={C} t={t} />}

      {/* sets · log */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 2px 12px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: C.accent }} />
          <Mono style={{ color: C.text, fontSize: 12.5, letterSpacing: "0.12em" }}>{t("SERIJE · DNEVNIK")}</Mono>
        </span>
        <Mono style={{ color: C.muted, fontSize: 10 }}>{doneCount}/{exLogs.length} {t("KONČANO")}</Mono>
      </div>

      {exLogs.map((s, si) => {
        const isActive = !s.done && exLogs.findIndex((x) => !x.done) === si;
        return (
          <div key={si} style={{ background: C.surface, border: `1px solid ${isActive ? `${C.accent}88` : C.border}`, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: isActive ? C.glowSoft : "none", transition: "border-color 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: s.done ? C.accent : C.surface2, color: s.done ? "#ffffff" : C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontWeight: 700, fontSize: 13.5, flexShrink: 0 }}>{si + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 15.5, color: C.text, letterSpacing: "0.02em" }}>{t("SERIJA")} {si + 1}</div>
                <Mono style={{ color: C.muted, fontSize: 10 }}>{t("CILJ")} · {ex.reps} {t("PON.")} {ex.load > 0 ? `@ ${ex.load} ${ex.unit}` : ""}</Mono>
              </div>
              <button onClick={() => setLog(si, { done: !s.done, reps: s.done ? s.reps : (s.reps || ex.reps) })}
                style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${s.done ? C.accent : C.border2}`, background: s.done ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
                {s.done && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              </button>
            </div>

            {/* reps */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Mono style={{ color: C.muted, fontSize: 10 }}>{t("PONOVITVE")}</Mono>
              <span><span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: s.reps > 0 ? C.accent : C.muted }}>{s.reps}</span><span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}> / {ex.reps}</span></span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <button style={{ width: 56, height: 50, borderRadius: 12, border: `1px dashed ${C.border2}`, background: "transparent", color: C.muted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span><span style={{ fontFamily: C.mono, fontSize: 8 }}>{t("VIDEO")}</span>
              </button>
              <div style={{ flex: 1 }}>
                <RepsSlider value={s.reps} max={ex.reps} onChange={(v) => setLog(si, { reps: v })} accent={C.accent} track={C.surface3} dim={C.muted} />
              </div>
            </div>

            {/* load */}
            {ex.load > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Mono style={{ color: C.muted, fontSize: 10, width: 44 }}>{t("TEŽA")}</Mono>
                <div style={{ flex: 1 }}><LoadStepper value={s.load} unit={ex.unit} onChange={(v) => setLog(si, { load: v })} C={C} /></div>
              </div>
            )}
          </div>
        );
      })}

      {/* add set */}
      <button onClick={addSet} style={{ width: "100%", padding: "15px", borderRadius: 14, border: `1px dashed ${C.border2}`, background: "transparent", color: C.muted, fontFamily: C.display, fontWeight: 700, fontSize: 14.5, cursor: "pointer", marginBottom: 18, WebkitTapHighlightColor: "transparent" }}>
        + {t("DODAJ SERIJO")}
      </button>

      {/* next exercise */}
      <Pressable onClick={nextExercise} style={{ width: "100%", padding: "17px", borderRadius: 999, border: "none", background: C.accent, color: C.btnText, fontFamily: C.display, fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 3px 12px rgba(28,24,20,0.16)", letterSpacing: "0.02em" }}>
        {exIdx >= SESSION.block.length - 1 ? t("KONČAJ TRENING") : t("NASLEDNJA VAJA")} →
      </Pressable>
    </div>
  );
}

/* small block card used for warm-up / cool-down */
function BlockCard({ C, icon, iconBg, title, info, onClick }) {
  const t = useT();
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text, textTransform: "uppercase", letterSpacing: "0.02em" }}>{title}</span>
        <Mono style={{ color: C.muted, fontSize: 11 }}>{info}</Mono>
      </span>
      <span style={{ color: C.muted }}>›</span>
    </button>
  );
}
