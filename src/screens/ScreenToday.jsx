import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../theme";
import { Mono, Icon, Card, SectionLabel, StatTile } from "../components/UI";
import { useT, useLang } from "../lib/i18n";
import { readinessFromCheckin, recommendation, DEFAULT_CHECKIN } from "../lib/readiness";
import { checkinPendingToday } from "../lib/notifications";
import { loadWellness } from "./widgets/CheckinCard";

const CHECKIN_KEY = "athlos:checkin";
const loadCheckin = () => { try { return { ...DEFAULT_CHECKIN, ...JSON.parse(localStorage.getItem(CHECKIN_KEY) || "{}") }; } catch { return { ...DEFAULT_CHECKIN }; } };

const DAYS_SL = ["NED", "PON", "TOR", "SRE", "ČET", "PET", "SOB"];
const DAYS_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS_SL = ["JAN", "FEB", "MAR", "APR", "MAJ", "JUN", "JUL", "AVG", "SEP", "OKT", "NOV", "DEC"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];


function useCountUp(target, dur = 900, delay = 200) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start - delay) / dur, 1);
      if (p < 0) { raf = requestAnimationFrame(tick); return; }
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

// ── Greek-inspired icon set (line-art, referencing classical mythology) ─────
const IconMoon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" fill={color} />
    <circle cx="17" cy="5" r="0.9" fill={color} opacity="0.5" />
    <circle cx="19.5" cy="8.5" r="0.55" fill={color} opacity="0.35" />
  </svg>
);
const IconFace = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 15c.8 1.2 2 1.8 3.5 1.8s2.7-.6 3.5-1.8" />
    <circle cx="9.5" cy="10" r="0.7" fill={color} />
    <circle cx="14.5" cy="10" r="0.7" fill={color} />
  </svg>
);
const IconBolt = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M13 2L4 13.5h7L9.5 22 20 10.5h-7L13 2z" />
  </svg>
);
const IconHeal = ({ size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const IconScroll = ({ size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    <path d="M9 7h6M9 11h5M9 15h4" />
  </svg>
);
const IconScales = ({ size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M6 3h12" />
    <path d="M4.5 9.5l4 7h-8l4-7z" />
    <path d="M19.5 9.5l-4 7h8l-4-7z" />
  </svg>
);

// Readiness battery — thick rounded activity ring (the reference's goal
// donut): tone-gradient arc on a quiet track, engraved 0–10 score + PARATUS /
// CAUTION / REQUIES status in the centre. `pct` animates the arc; `level` is
// the settled score so the colour and label don't flicker during count-up.
function BatteryRing({ pct, level, C, size = 180 }) {
  const dark = C.name === "dark";
  const SW = 9; // thin, elegant stroke — the hero ring
  const r = (210 - SW) / 2 - 3;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(pct, 2) / 100);
  const label = level >= 70 ? "PARATUS" : level >= 40 ? "CAUTION" : "REQUIES";
  const toneCol = level >= 70 ? C.accent : level >= 40 ? C.yellow : C.red;
  return (
    <div style={{ width: size, height: size, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg viewBox="0 0 210 210" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <circle cx="105" cy="105" r={r} fill="none" strokeWidth={SW}
          stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(28,24,20,0.07)"} />
        <circle
          cx="105" cy="105" r={r} fill="none" stroke={toneCol} strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 105 105)"
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: C.heading, fontWeight: 800, fontSize: size * 0.26, color: C.text, lineHeight: 1, letterSpacing: "-0.02em" }}>{(pct / 10).toFixed(1)}</div>
        <div style={{ fontFamily: C.mono, fontWeight: 600, fontSize: 9.5, color: toneCol, letterSpacing: "0.22em", marginTop: 7, textTransform: "uppercase" }}>{label}</div>
      </div>
    </div>
  );
}

// Smooth mini sparkline for the half-width stat cards (stroke only + end dot).
function MiniSpark({ data, color, C, h = 44 }) {
  const W = 130, PAD = 5;
  const minV = Math.min(...data), maxV = Math.max(...data);
  const rng = (maxV - minV) || 1;
  const toX = (i) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v) => PAD + (1 - (v - minV) / rng) * (h - PAD * 2);
  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const d = pts.reduce((s, p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const px = pts[i - 1], cx = ((px.x + p.x) / 2).toFixed(1);
    return `${s} C${cx},${px.y.toFixed(1)} ${cx},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, "");
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3.4" fill={color} stroke={C.name === "dark" ? "#101010" : "#FFFFFF"} strokeWidth="1.6" />
    </svg>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = "", onChange, C }) {
  const trackRef = useRef(null);
  const toValue = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    return parseFloat((Math.round(raw / step) * step).toFixed(2));
  };
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <Mono style={{ color: C.muted, fontSize: 10 }}>{label}</Mono>
        <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 13.5, color: C.text }}>{value}{suffix}</span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onChange(toValue(e.clientX)); }}
        onPointerMove={(e) => { if (e.buttons > 0) onChange(toValue(e.clientX)); }}
        style={{ height: 10, borderRadius: 999, background: C.surface3, cursor: "pointer", position: "relative", userSelect: "none", touchAction: "none", overflow: "hidden" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: C.accent, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

function QuickAddSheet({ C, t, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ part: "", customPart: "", grade: 2, note: "" });
  const PARTS = ["Hamstring", "Koleno", "Gleženj", "Mečna", "Križ", "Ramo", "Komolec", "Drugo"];
  // "Drugo" needs a free-text body part before it can be saved
  const valid = form.part && (form.part !== "Drugo" || form.customPart.trim());
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: C.bg, borderRadius: "28px 28px 0 0", padding: "0 18px 32px", maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border2, margin: "14px auto 20px" }} />
        {step === 0 ? (
          <>
            <Mono style={{ color: C.muted, fontSize: 11, letterSpacing: "0.12em", marginBottom: 16, display: "block" }}>{t("HITRI VNOS")}</Mono>
            {[
              { icon: <IconHeal size={22} color={C.accent} />, label: t("Poškodba"), sub: t("Zabeleži poškodbo ali bolečino"), isActive: true },
              { icon: <IconScroll size={22} color={C.muted} />, label: t("Opomba"), sub: t("Splošna opomba o treningu"), isActive: false },
              { icon: <IconScales size={22} color={C.muted} />, label: t("Tehtanje"), sub: t("Zabeleži telesno težo"), isActive: false },
            ].map(({ icon, label, sub, isActive }, i) => (
              <button key={i} onClick={() => isActive && setStep(1)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 10, background: C.surface, border: `1px solid ${isActive ? C.accent : C.border}`, borderRadius: 16, cursor: isActive ? "pointer" : "default", textAlign: "left", opacity: isActive ? 1 : 0.42, WebkitTapHighlightColor: "transparent" }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: `${isActive ? C.accent : C.muted}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>{label}</span>
                  <Mono style={{ color: C.muted, fontSize: 10 }}>{sub}</Mono>
                </span>
                {isActive && <span style={{ color: C.muted }}>›</span>}
              </button>
            ))}
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button onClick={() => setStep(0)} style={{ background: "none", border: `1px solid ${C.border2}`, borderRadius: 8, cursor: "pointer", color: C.muted, fontSize: 17, padding: "4px 10px", lineHeight: 1, WebkitTapHighlightColor: "transparent" }}>←</button>
              <Mono style={{ color: C.muted, fontSize: 11, letterSpacing: "0.12em" }}>{t("NOVA POŠKODBA")}</Mono>
            </div>
            <Mono style={{ color: C.muted, fontSize: 10, marginBottom: 8, display: "block" }}>{t("DEL TELESA")}</Mono>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {PARTS.map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, part: p }))} style={{ padding: "8px 12px", borderRadius: 999, border: `1px solid ${form.part === p ? C.accent : C.border2}`, background: form.part === p ? `${C.accent}1f` : "transparent", color: form.part === p ? C.accent : C.text2, fontFamily: C.display, fontWeight: 600, fontSize: 13.5, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>{t(p)}</button>
              ))}
            </div>
            {form.part === "Drugo" && (
              <div style={{ animation: "athlosFade 0.2s ease", marginBottom: 18 }}>
                <Mono style={{ color: C.muted, fontSize: 10, marginBottom: 8, display: "block" }}>{t("KJE JE POŠKODBA")}</Mono>
                <input value={form.customPart} onChange={e => setForm(f => ({ ...f, customPart: e.target.value }))} placeholder={t("npr. Zapestje, Trebušna mišica...")} autoFocus style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border2}`, background: C.surface, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: "16px", outline: "none", boxSizing: "border-box" }} />
              </div>
            )}
            <Mono style={{ color: C.muted, fontSize: 10, marginBottom: 8, display: "block" }}>{t("STOPNJA")}</Mono>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[[1, t("LAHKA"), C.accent], [2, t("ZMERNA"), C.yellow || "#f59e0b"], [3, t("HUDA"), C.red || "#ef4444"]].map(([g, label, col]) => (
                <button key={g} onClick={() => setForm(f => ({ ...f, grade: g }))} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${form.grade === g ? col : C.border2}`, background: form.grade === g ? `${col}1f` : "transparent", color: form.grade === g ? col : C.muted, fontFamily: C.display, fontWeight: 700, fontSize: 12.5, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>{g} · {label}</button>
              ))}
            </div>
            <Mono style={{ color: C.muted, fontSize: 10, marginBottom: 6, display: "block" }}>{t("OPIS")}</Mono>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={t("Opiši simptome ali lokacijo bolečine...")} rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border2}`, background: C.surface, color: C.text, fontFamily: C.display, fontSize: "14px", resize: "none", outline: "none", marginBottom: 18, boxSizing: "border-box" }} />
            <button onClick={() => { if (!valid) return; const partLabel = form.part === "Drugo" ? form.customPart.trim() : t(form.part); onSave({ name: `${t("Poškodba")} · ${partLabel}`, grade: form.grade, phase: 0, progressNote: form.note || t("Sveža poškodba — začetek protokola."), returnWeeks: form.grade * 2, returnDate: `${t("za")} ${form.grade * 2} ${t("tedna")}`, coachNote: "" }); onClose(); }} style={{ width: "100%", padding: "16px", borderRadius: 999, border: "none", background: valid ? C.btn : C.surface3, color: valid ? C.btnText : C.muted, fontFamily: C.display, fontWeight: 800, fontSize: 15.5, cursor: valid ? "pointer" : "default", letterSpacing: "0.04em", WebkitTapHighlightColor: "transparent" }}>{t("SHRANI POŠKODBO")}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Body stats (tapping the readiness circle) ────────────────
const STAT_METRICS = [
  {
    key: "weight", label: "Teža", labelEn: "Weight", unit: "kg", color: "#1F7A52",
    data: [83.2, 82.8, 82.5, 82.1, 81.9, 82.3, 81.7, 81.4, 81.1, 80.9, 80.6, 80.8, 80.3, 80.1],
    trendSL: "−3.1 kg za 14 dni", trendEN: "−3.1 kg over 14 days", good: "down",
  },
  {
    key: "sleep", label: "Spanje", labelEn: "Sleep", unit: "h", color: "#7A8B5C",
    data: [7.2, 6.5, 8.1, 7.8, 6.9, 7.5, 8.2, 7.0, 6.8, 7.9, 8.0, 7.3, 7.6, 7.4],
    trendSL: "Ø 7.4h / noč", trendEN: "Avg 7.4h / night", good: "up",
  },
  {
    key: "hrv", label: "HRV", labelEn: "HRV", unit: "ms", color: "#00C878",
    data: [62, 58, 65, 71, 68, 55, 60, 63, 67, 72, 69, 64, 66, 70],
    trendSL: "+13% za 14 dni", trendEN: "+13% over 14 days", good: "up",
  },
  {
    key: "soreness", label: "Sornost", labelEn: "Soreness", unit: "/5", color: "#C95A3F",
    data: [3, 2, 4, 3, 2, 1, 3, 4, 3, 2, 2, 3, 2, 2],
    trendSL: "Povprečje 2.6/5", trendEN: "Average 2.6/5", good: "down",
  },
];

function SparkChart({ data, color, C, metricKey }) {
  const W = 320, H = 150;
  const PAD = { top: 16, right: 8, bottom: 28, left: 36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const minV = Math.min(...data), maxV = Math.max(...data);
  const rng = (maxV - minV) || 1;
  const yMin = minV - rng * 0.2, yMax = maxV + rng * 0.2;
  const toX = i => PAD.left + (i / (data.length - 1)) * cW;
  const toY = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * cH;
  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const line = pts.reduce((s, p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const px = pts[i - 1], cx = ((px.x + p.x) / 2).toFixed(1);
    return `${s} C${cx},${px.y.toFixed(1)} ${cx},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, "");
  const bot = (PAD.top + cH).toFixed(1);
  const area = `${line} L${pts[pts.length-1].x.toFixed(1)},${bot} L${pts[0].x.toFixed(1)},${bot} Z`;
  const gid = `sg-${metricKey}`;
  const yLabels = [minV, (minV + maxV) / 2, maxV];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yLabels.map((v, i) => (
        <line key={i} x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke={C.border} strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const isLast = i === pts.length - 1;
        if (i % 3 !== 0 && !isLast) return null;
        return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={isLast ? 5 : 3.5} fill={isLast ? color : C.bg} stroke={color} strokeWidth={isLast ? 0 : 2} />;
      })}
      {yLabels.map((v, i) => (
        <text key={i} x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fontSize="9" fill={C.muted} fontFamily="monospace">{Math.round(v * 10) / 10}</text>
      ))}
      {data.map((_, i) => {
        if (i % 4 !== 0 && i !== data.length - 1) return null;
        const d = new Date(); d.setDate(d.getDate() - (data.length - 1 - i));
        return <text key={i} x={toX(i).toFixed(1)} y={H - 4} textAnchor="middle" fontSize="9" fill={C.muted} fontFamily="monospace">{d.getDate()}/{d.getMonth() + 1}</text>;
      })}
    </svg>
  );
}

function StatsSheet({ C, lang, onClose }) {
  const [metric, setMetric] = useState("weight");
  const m = STAT_METRICS.find(x => x.key === metric);
  const current = m.data[m.data.length - 1];
  const diff = Math.round((current - m.data[0]) * 10) / 10;
  const avg = Math.round((m.data.reduce((s, v) => s + v, 0) / m.data.length) * 10) / 10;
  const minV = Math.round(Math.min(...m.data) * 10) / 10;
  const maxV = Math.round(Math.max(...m.data) * 10) / 10;
  const isGood = (m.good === "down" && diff <= 0) || (m.good === "up" && diff >= 0);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: C.bg, borderRadius: "28px 28px 0 0", padding: "0 18px 44px", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border2, margin: "14px auto 20px" }} />
        <Mono style={{ color: C.muted, fontSize: 10, letterSpacing: "0.12em", display: "block", marginBottom: 20 }}>
          {lang === "en" ? "BODY STATS · 14 DAYS" : "TELESNA STATISTIKA · 14 DNI"}
        </Mono>
        {/* Metric tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {STAT_METRICS.map(sm => (
            <button key={sm.key} onClick={() => setMetric(sm.key)} style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: 999,
              border: `1.5px solid ${metric === sm.key ? sm.color : C.border}`,
              background: metric === sm.key ? `${sm.color}22` : "transparent",
              color: metric === sm.key ? sm.color : C.muted,
              fontFamily: C.display, fontWeight: 700, fontSize: 14.5,
              cursor: "pointer", transition: "all 0.15s", WebkitTapHighlightColor: "transparent",
            }}>
              {lang === "en" ? sm.labelEn : sm.label}
            </button>
          ))}
        </div>
        {/* Current value + diff */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 49.5, color: C.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{current}</span>
            <span style={{ fontFamily: C.display, fontWeight: 500, fontSize: 20, color: C.muted }}>{m.unit}</span>
            <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: isGood ? C.accent : C.red, marginLeft: 4 }}>
              {diff > 0 ? "+" : ""}{diff}{m.unit}
            </span>
          </div>
          <div style={{ fontFamily: C.display, fontSize: 14.5, color: C.muted, marginTop: 5 }}>
            {lang === "en" ? m.trendEN : m.trendSL}
          </div>
        </div>
        {/* Chart */}
        <div style={{ marginBottom: 22 }}>
          <SparkChart data={m.data} color={m.color} C={C} metricKey={m.key} />
        </div>
        {/* Min / Avg / Max */}
        <div style={{ display: "flex", gap: 8 }}>
          {[["MIN", minV], [lang === "en" ? "AVG" : "POVP", avg], ["MAX", maxV]].map(([lbl, val]) => (
            <div key={lbl} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
              <Mono style={{ color: C.muted, fontSize: 9, display: "block" }}>{lbl}</Mono>
              <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text, marginTop: 4 }}>{val} {m.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bottom sheet that can be dismissed either by tapping the backdrop or by
// pulling down once its content is scrolled to the top — the same gesture
// as iOS/Google Maps sheets ("scroll down and it goes away").
function DragSheet({ children, onClose, style }) {
  const scrollRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Native non-passive listeners: React registers its touch handlers as
  // passive, so e.preventDefault() there can't stop the native scroll — and
  // without it the dismiss drag and the scroll fight over the same gesture.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const g = { startX: 0, startY: 0, active: false, decided: false, dy: 0 };
    const onStart = (e) => {
      // the sheet owns its touches — nothing behind it (pull-to-refresh,
      // tab swipes) may react to them
      e.stopPropagation();
      g.startX = e.touches[0].clientX;
      g.startY = e.touches[0].clientY;
      g.active = false;
      g.decided = false;
      g.dy = 0;
    };
    const onMove = (e) => {
      e.stopPropagation();
      const dx = e.touches[0].clientX - g.startX;
      const dy = e.touches[0].clientY - g.startY;
      if (!g.active) {
        if (!g.decided && dy > 6 && Math.abs(dx) < dy && el.scrollTop <= 0) {
          // downward pull with the content at the top → dismiss drag;
          // rebase so the sheet follows from where the pull was armed
          g.active = true;
          g.startY = e.touches[0].clientY;
          setDragging(true);
        } else {
          // horizontal move (sliders), upward move or scrolled content →
          // a normal gesture; stay out of the way until the finger lifts
          if (Math.abs(dx) > 8 || dy < -8 || el.scrollTop > 0) g.decided = true;
          return;
        }
      }
      e.preventDefault(); // the drag owns the gesture — no scroll under it
      g.dy = Math.max(0, e.touches[0].clientY - g.startY);
      setDragY(g.dy);
    };
    const onEnd = (e) => {
      e.stopPropagation();
      if (g.active && g.dy > 90) {
        setDragY(800); // slide fully off, then unmount
        setTimeout(() => closeRef.current(), 220);
      } else {
        setDragY(0);
      }
      g.active = false;
      setDragging(false);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      className="athlos-scroll"
      style={{
        ...style,
        overscrollBehavior: "contain",
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        transition: dragging ? "none" : "transform 0.28s cubic-bezier(.22,1,.36,1)",
      }}
    >
      {children}
    </div>
  );
}

export default function ScreenToday({ go, profile, chatUnread = 0 }) {
  const C = useTheme();
  const t = useT();
  const lang = useLang();
  const [openStats, setOpenStats] = useState(false);
  const [openBattery, setOpenBattery] = useState(false); // battery-info sheet (tap the score)
  const [openNotifs, setOpenNotifs] = useState(false);   // notifications sheet (bell, top-right)
  const [checkin, setCheckin] = useState(loadCheckin);
  useEffect(() => { try { localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkin)); } catch {} }, [checkin]);
  const setC = (k, v) => setCheckin((p) => ({ ...p, [k]: v }));

  const now = new Date();
  const DAYS = lang === "en" ? DAYS_EN : DAYS_SL;
  const MONTHS = lang === "en" ? MONTHS_EN : MONTHS_SL;
  const dateStr = `${DAYS[now.getDay()]} · ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const { battery, components, season } = readinessFromCheckin(checkin);
  const rec = recommendation(battery);
  const tone = rec.tone === "accent" ? C.accent : rec.tone === "yellow" ? C.yellow : C.red;
  const shown = useCountUp(battery);

  const rise = (d) => ({ animation: `athlosRise 0.55s cubic-bezier(0.22,1,0.36,1) ${d}s both` });

  // ── Notifications (bell, top-left) — built from state the app already has:
  // today's check-in, unread chats, and the upcoming session. Recomputed every
  // render, so submitting the questionnaire (a state update) clears its row.
  const checkinPending = checkinPendingToday();
  const chatLine = chatUnread === 0 ? "" : lang === "en"
    ? `${chatUnread} unread conversation${chatUnread === 1 ? "" : "s"}.`
    : chatUnread === 1 ? "1 neprebran pogovor."
    : chatUnread === 2 ? "2 neprebrana pogovora."
    : chatUnread <= 4 ? `${chatUnread} neprebrani pogovori.`
    : `${chatUnread} neprebranih pogovorov.`;
  const notifs = [
    checkinPending && {
      id: "checkin", color: C.accent, icon: <IconFace size={25} color={C.accent} />,
      title: t("Jutranji check-in"), text: t("Odgovori na 4 vprašanja in posodobi baterijo."),
      onTap: () => setOpenNotifs(false),
    },
    chatUnread > 0 && {
      id: "chat", color: C.gold, icon: <Icon name="chat" color={C.gold} size={25} />,
      title: t("Nova sporočila"), text: chatLine,
      onTap: () => { setOpenNotifs(false); go("chat"); },
    },
    now.getHours() < 17 && {
      id: "train", color: C.red, icon: <Icon name="train" color={C.red} size={25} />,
      title: t("Današnji trening"), text: t("Moč · spodnji del ob 17:00."),
      onTap: () => { setOpenNotifs(false); go("train"); },
    },
  ].filter(Boolean);
  const bellDot = checkinPending || chatUnread > 0;

  // Monday-first week strip: day letter + date, dot = check-in done that day
  const wellDays = loadWellness().days;
  const weekLetters = lang === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["P", "T", "S", "Č", "P", "S", "N"];
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const pad2 = (n) => String(n).padStart(2, "0");
  const week = weekLetters.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return { label, iso, num: d.getDate(), done: !!wellDays[iso], isToday: d.toDateString() === now.toDateString() };
  });
  const doneThisWeek = week.filter((d) => d.done).length;
  // Streak — consecutive days with a check-in ending today
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    if (wellDays[iso]) streak++; else break;
  }

  // Derived metrics for the recovery row, weekly progress and quick stats
  const recComp = components.find((c) => c.key === "recovery");
  const recScore = recComp ? recComp.score : battery;
  const fatigue = Math.max(1, Math.min(5, checkin.soreness || 2));
  const fatigueWord = fatigue <= 2 ? t("Nizka") : fatigue <= 3 ? t("Zmerna") : t("Visoka");
  const WEEKLY_GOAL = 5;
  const doneWorkouts = Math.min(doneThisWeek, WEEKLY_GOAL);
  const trend = battery >= 70 ? "+6%" : battery >= 40 ? "−2%" : "−9%";
  const explain = rec.key === "full"
    ? t("Regeneracija in počutje sta visoka — telo je pripravljeno na polno obremenitev.")
    : rec.key === "light"
      ? t("Nekateri kazalniki so nižji — danes izberi zmeren napor.")
      : t("Telo kaže znake utrujenosti — danes daj prednost regeneraciji.");

  return (
    <div style={{ padding: "8px 20px 40px", color: C.text, position: "relative" }}>
      {/* Header — greeting + date, bell + avatar. Calm; no eyebrow, no glow. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 34px", ...rise(0.03) }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 27, color: C.text, lineHeight: 1.1, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t("Živjo,")} {(profile?.name || "Športnik").trim().split(/\s+/)[0]}
          </div>
          <div style={{ fontFamily: C.display, fontWeight: 500, fontSize: 13, color: C.muted, marginTop: 4 }}>{dateStr}</div>
        </div>
        <button onClick={() => setOpenNotifs(true)} aria-label={t("Obvestila")} style={{
          width: 42, height: 42, borderRadius: "50%", cursor: "pointer", flexShrink: 0,
          background: C.surface2, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.text2, WebkitTapHighlightColor: "transparent", position: "relative",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 01-3.4 0" />
          </svg>
          {bellDot && <span aria-hidden="true" style={{ position: "absolute", top: 3, right: 3, width: 8, height: 8, borderRadius: "50%", background: C.red, border: `1.5px solid ${C.bg}` }} />}
        </button>
        <button onClick={() => go("settings")} aria-label={t("Profil")} style={{
          width: 42, height: 42, borderRadius: "50%", padding: 0, overflow: "hidden", flexShrink: 0,
          border: "none", background: C.surface2, cursor: "pointer", WebkitTapHighlightColor: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {profile?.photo
            ? <img src={profile.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 16, color: C.text2 }}>{(profile?.name || "A").trim()[0].toUpperCase()}</span>}
        </button>
      </div>

      {/* 2 · WEEKLY CALENDAR STRIP — quiet, today the only filled cell */}
      <div style={{ display: "flex", gap: 6, marginBottom: 32, ...rise(0.06) }}>
        {week.map((d) => (
          <button key={d.iso} onClick={() => go("season")} aria-label={`${d.label} ${d.num}`} style={{
            flex: 1, padding: "6px 0 8px", background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
            WebkitTapHighlightColor: "transparent",
          }}>
            <span style={{ fontFamily: C.mono, fontWeight: 600, fontSize: 9.5, letterSpacing: "0.06em", color: d.isToday ? C.text : C.muted2 }}>{d.label}</span>
            <span style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: d.isToday ? C.accent : C.surface2,
              color: d.isToday ? C.btnText : C.text2,
              fontFamily: C.display, fontWeight: 700, fontSize: 13.5,
            }}>{d.num}</span>
            <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: "50%", background: d.done ? C.accent : "transparent" }} />
          </button>
        ))}
      </div>

      {/* 3 · READINESS — the dominant element; tap for the full breakdown */}
      <button onClick={() => setOpenBattery(true)} aria-label={t("READINESS · BATERIJA")} style={{
        width: "100%", background: "none", border: "none", padding: 0, marginBottom: 32,
        cursor: "pointer", WebkitTapHighlightColor: "transparent",
        display: "flex", flexDirection: "column", alignItems: "center", ...rise(0.1),
      }}>
        <BatteryRing pct={shown} level={battery} C={C} size={196} />
        <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.26em", color: C.muted2, marginTop: 16, textTransform: "uppercase" }}>
          {t("Pripravljenost")} · {season === "off" ? t("OFF-SEASON") : t("MID-SEASON")}
        </span>
      </button>

      {/* 4 · TODAY'S RECOMMENDATION — AI call + short explanation */}
      <div style={{ marginBottom: 32, ...rise(0.13) }}>
        <SectionLabel>{t("PRIPOROČILO")}</SectionLabel>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: tone, flexShrink: 0 }} />
            <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text, lineHeight: 1.25 }}>{t(rec.text)}</span>
          </div>
          <p style={{ fontFamily: C.display, fontWeight: 500, fontSize: 14, color: C.muted, lineHeight: 1.5, margin: "12px 0 0" }}>{explain}</p>
        </Card>
      </div>

      {/* 5 · TODAY'S WORKOUT — name · meta · big Start button */}
      <div style={{ marginBottom: 32, ...rise(0.16) }}>
        <SectionLabel>{t("DANAŠNJI TRENING")} · 17:00</SectionLabel>
        <Card pad={22}>
          <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 25, margin: "0 0 18px", color: C.text, lineHeight: 1.12, letterSpacing: "-0.01em" }}>{t("Moč · Spodnji del")}</h2>
          <div style={{ display: "flex", marginBottom: 22 }}>
            {[
              { k: t("TRAJANJE"), v: `62 ${t("min")}` },
              { k: t("KALORIJE"), v: "~480" },
              { k: t("TEŽAVNOST"), v: t("Srednja") },
            ].map((m, i) => (
              <div key={m.k} style={{ flex: 1, borderLeft: i ? `1px solid ${C.border}` : "none", paddingLeft: i ? 14 : 0 }}>
                <div style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: "0.1em", color: C.muted2, marginBottom: 6 }}>{m.k}</div>
                <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 16.5, color: C.text }}>{m.v}</div>
              </div>
            ))}
          </div>
          <button onClick={() => go("train")} style={{
            width: "100%", height: 54, borderRadius: 16, border: "none", background: C.btn, color: C.btnText,
            fontFamily: C.display, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10, cursor: "pointer", WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
            {t("Začni trening")}
          </button>
        </Card>
      </div>

      {/* 6 · RECOVERY SUMMARY — Sleep · Recovery · Fatigue · Mood in one row */}
      <div style={{ marginBottom: 32, ...rise(0.19) }}>
        <SectionLabel>{t("STANJE")}</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <StatTile style={{ flex: 1, minWidth: 0 }} onClick={() => setOpenBattery(true)} label={t("Spanje").toUpperCase()} value={`${checkin.sleepH}h`} barPct={Math.min(1, (checkin.sleepH || 0) / 8)} />
          <StatTile style={{ flex: 1, minWidth: 0 }} onClick={() => setOpenBattery(true)} label={t("Regeneracija").toUpperCase()} value={`${recScore}%`} barPct={recScore / 100} />
          <StatTile style={{ flex: 1, minWidth: 0 }} onClick={() => setOpenBattery(true)} label={t("Utrujenost").toUpperCase()} value={fatigueWord} barPct={fatigue / 5} />
          <StatTile style={{ flex: 1, minWidth: 0 }} onClick={() => setOpenBattery(true)} label={t("Počutje").toUpperCase()} value={`${checkin.mood}/5`} barPct={checkin.mood / 5} />
        </div>
      </div>

      {/* 7 · WEEKLY PROGRESS — streak · completed/goal · progress bar */}
      <div style={{ marginBottom: 32, ...rise(0.22) }}>
        <SectionLabel action={t("Koledar")} onAction={() => go("season")}>{t("TA TEDEN")}</SectionLabel>
        <Card onClick={() => go("season")}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 36, color: C.text, lineHeight: 1, letterSpacing: "-0.02em" }}>{streak}</span>
              <span style={{ fontFamily: C.display, fontWeight: 500, fontSize: 14, color: C.muted }}>{t("dni zapored")}</span>
            </span>
            <span style={{ textAlign: "right" }}>
              <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: C.text }}>{doneWorkouts}</span>
              <span style={{ fontFamily: C.display, fontWeight: 500, fontSize: 14, color: C.muted }}> / {WEEKLY_GOAL} {t("treningov")}</span>
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: C.surface3, overflow: "hidden" }}>
            <div style={{ width: `${Math.round((doneWorkouts / WEEKLY_GOAL) * 100)}%`, height: "100%", borderRadius: 999, background: C.accent, transition: "width 0.8s cubic-bezier(.22,1,.36,1)" }} />
          </div>
        </Card>
      </div>

      {/* 8 · QUICK STATS — 4 compact cards */}
      <div style={{ marginBottom: 8, ...rise(0.25) }}>
        <SectionLabel>{t("HITRE STATISTIKE")}</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatTile label={t("OBREMENITEV")} value={t("Optimalna")} sub={t("7-dnevno povprečje")} />
          <StatTile label={t("Regeneracija").toUpperCase()} value={`${recScore}%`} sub={`${components.length} ${t("vira")}`} />
          <StatTile label={t("TREND")} value={trend} valueColor={battery >= 70 ? C.accent : C.text} sub={t("vs. včeraj")} />
          <StatTile label={t("KALORIJE DANES")} value="480" sub="kcal" />
        </div>
      </div>

      {openStats && <StatsSheet C={C} lang={lang} onClose={() => setOpenStats(false)} />}

      {/* ── NOTIFICATIONS — bottom sheet, opens from the bell ── */}
      {openNotifs && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpenNotifs(false); }} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(20,18,14,0.55)" }}>
          <DragSheet onClose={() => setOpenNotifs(false)} style={{
            position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "70%", overflowY: "auto",
            background: C.bg, borderRadius: "28px 28px 0 0", padding: "16px 20px",
            paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
            animation: "athlosRise 0.32s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: "0 auto 18px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 14.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.text, whiteSpace: "nowrap" }}>{t("Obvestila")}</span>
              <span style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {notifs.length === 0 && (
              <div style={{ textAlign: "center", padding: "26px 20px 32px", color: C.muted, fontFamily: C.display, fontStyle: "italic", fontSize: 16.5 }}>
                {t("Nič novega.")}
              </div>
            )}

            {notifs.map((nf) => (
              <button key={nf.id} onClick={nf.onTap} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 10,
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                cursor: "pointer", textAlign: "left", WebkitTapHighlightColor: "transparent",
              }}>
                <span style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {nf.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: C.display, fontWeight: 700, fontSize: 16, color: C.text }}>{nf.title}</span>
                  <span style={{ display: "block", fontFamily: C.display, fontWeight: 500, fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{nf.text}</span>
                </span>
                <span style={{ color: C.muted, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </DragSheet>
        </div>
      )}

      {/* ── BATTERY INFO — bottom sheet, opens from the medallion ── */}
      {openBattery && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpenBattery(false); }} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(20,18,14,0.55)" }}>
          <DragSheet onClose={() => setOpenBattery(false)} style={{
            position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "88%", overflowY: "auto",
            background: C.bg, borderRadius: "28px 28px 0 0", padding: "16px 20px",
            paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
            animation: "athlosRise 0.32s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: "0 auto 18px" }} />

            {/* header — score, status, season */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <Mono style={{ color: C.gold, fontSize: 10, letterSpacing: "0.3em" }}>{t("READINESS · BATERIJA")}</Mono>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginTop: 10 }}>
                <span style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 51.5, color: C.text, lineHeight: 1 }}>{(battery / 10).toFixed(1)}</span>
                <Mono style={{ color: tone, fontSize: 11, letterSpacing: "0.22em" }}>{battery >= 70 ? "PARATUS" : battery >= 40 ? "CAUTION" : "REQUIES"}</Mono>
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={{ padding: "5px 11px", borderRadius: 999, background: `${tone}1a`, border: `1px solid ${tone}50`, display: "inline-block" }}>
                  <Mono style={{ color: tone, fontSize: 10 }}>{season === "off" ? t("OFF-SEASON") : t("MID-SEASON")}</Mono>
                </span>
              </div>
              <p style={{ fontFamily: C.display, fontStyle: "italic", fontSize: 16, color: C.text2, margin: "10px 0 0", lineHeight: 1.5 }}>{t(rec.text)}</p>
            </div>

            {/* quick metrics — tap for the metric history */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { icon: <IconMoon size={20} color={tone} />, label: t("SPANJE"), val: `${checkin.sleepH}h` },
                { icon: <IconFace size={20} color={tone} />, label: t("POČUTJE"), val: `${checkin.mood}/5` },
                { icon: <IconBolt size={18} color={tone} />, label: t("SORNOST"), val: `${checkin.soreness}/5` },
              ].map(({ icon, label, val }) => (
                <button key={label} onClick={() => setOpenStats(true)} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 6px", textAlign: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>{icon}</div>
                  <Mono style={{ color: C.muted, fontSize: 8, letterSpacing: "0.04em" }}>{label}</Mono>
                  <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 14.5, color: C.text, marginTop: 2 }}>{val}</div>
                </button>
              ))}
            </div>

            {/* breakdown — engraved section */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 12px" }}>
              <span style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 13.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.text, whiteSpace: "nowrap" }}>{t("RAZČLENITEV")}</span>
              <span style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {components.map((c) => (
                <div key={c.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text }}>{t(c.label)}</span>
                      <Mono style={{ color: C.muted2, fontSize: 9 }}>{t(c.sub)}</Mono>
                    </span>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <Mono style={{ color: C.muted2, fontSize: 9 }}>{Math.round(c.weight * 100)}%</Mono>
                      <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 14.5, color: c.score >= 70 ? C.accent : c.score >= 40 ? C.yellow : C.red }}>{c.score}</span>
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: C.surface3, overflow: "hidden" }}>
                    <div style={{ width: `${c.score}%`, height: "100%", borderRadius: 999, background: c.score >= 70 ? C.accent : c.score >= 40 ? C.yellow : C.red, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
              <Mono style={{ color: C.muted2, fontSize: 9, marginTop: 2 }}>{t("7-dnevno drseče okno · uteži se prilagodijo razpoložljivim podatkom")}</Mono>
            </div>

            {/* inputs — engraved section */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px" }}>
              <span style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 13.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.text, whiteSpace: "nowrap" }}>{t("JUTRANJI CHECK-IN")}</span>
              <span style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Slider label={t("SPANEC")} value={checkin.sleepH} min={4} max={10} step={0.1} suffix="h" onChange={(v) => setC("sleepH", v)} C={C} />
              <Slider label={t("KAKOVOST SPANJA")} value={checkin.sleepQuality} min={1} max={5} onChange={(v) => setC("sleepQuality", v)} C={C} />
              <Slider label={t("POČUTJE")} value={checkin.mood} min={1} max={5} onChange={(v) => setC("mood", v)} C={C} />
              <Slider label={t("SORNOST (MIŠICE)")} value={checkin.soreness} min={1} max={5} onChange={(v) => setC("soreness", v)} C={C} />
              <Slider label={t("STRES")} value={checkin.stress} min={1} max={5} onChange={(v) => setC("stress", v)} C={C} />
              <Slider label={t("HIDRACIJA")} value={checkin.hydration} min={0} max={120} suffix="%" onChange={(v) => setC("hydration", v)} C={C} />
              <div>
                <Mono style={{ color: C.muted, fontSize: 10, marginBottom: 6, display: "block" }}>{t("FAZA SEZONE")}</Mono>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["mid", t("Sredina sezone")], ["off", t("Off-season")]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setC("season", val)} style={{ flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", border: `1px solid ${checkin.season === val ? C.accent : C.border2}`, background: checkin.season === val ? `${C.accent}1f` : "transparent", color: checkin.season === val ? C.accent : C.muted, fontFamily: C.display, fontWeight: 700, fontSize: 13.5, WebkitTapHighlightColor: "transparent" }}>{lbl}</button>
                  ))}
                </div>
              </div>
              <Mono style={{ color: C.muted2, fontSize: 9 }}>{t("HRV/RHR pridejo iz Apple Health · prehrana iz dnevnika · hitrost iz treninga")}</Mono>
            </div>
          </DragSheet>
        </div>
      )}
    </div>
  );
}
