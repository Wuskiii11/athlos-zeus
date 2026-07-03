import React, { useState } from "react";
import { useTheme, useDatePicker, useTimePicker } from "../theme";
import { Pressable, PrimaryBtn } from "../components/UI";
import { listEvents, addEvent, deleteEvent, replaceEvents } from "../lib/api";
import { useT, useLang } from "../lib/i18n";

export const DAY_NAMES = ["PON", "TOR", "SRE", "ČET", "PET", "SOB", "NED"];
export const DAY_NAMES_EN = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayIdx(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return (d.getDay() + 6) % 7;
}

export function fmtDate(dateStr, lang = "sl") {
  const d = new Date(dateStr + "T00:00:00");
  const months = lang === "en"
    ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    : ["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"];
  return `${d.getDate()}. ${months[d.getMonth()]}`;
}

export const evColor = (C, type) => ({ trening: C.accent, tekma: C.red, recovery: C.yellow }[type]);
export const EV_LABEL = { trening: "TRENING", tekma: "TEKMA", recovery: "REGENERACIJA" };

const MOBILITY = {
  "Nogomet": "Mobilnost kolkov + raztezanje zadnje lože",
  "Košarka": "Gleženj + skočna mobilnost, raztezanje mečnic",
  "Hokej": "Odpiranje kolkov + spodnji hrbet",
  "Tek / Atletika": "Raztezanje mečnic, kolkov in fleksorjev",
  "Tenis": "Rama + rotacija trupa, zapestja",
  "Plavanje": "Mobilnost ramen + prsna hrbtenica",
  "Kolesarstvo": "Razbremenitev kolkov + spodnji hrbet",
  "Fitnes / Moč": "Splošna mobilnost + valjanje mišic",
};

function mobilityFor(sport) {
  return MOBILITY[sport] || "Lahka mobilnost + raztezanje za tvoj šport";
}

function Legend({ color, label }) {
  const C = useTheme();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.muted, fontFamily: C.display, fontWeight: 600, fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

function EventRow({ ev, onDelete }) {
  const C = useTheme();
  const t = useT();
  const lang = useLang();
  const [pressed, setPressed] = useState(false);
  const color = evColor(C, ev.type) || C.accent;
  const done = !!ev.completed;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 10, background: C.surface, border: `1px solid ${done ? `${C.accent}40` : C.border}`, borderRadius: 16, opacity: done ? 0.85 : 1 }}>
      <div style={{ width: 4, height: 40, borderRadius: 999, background: color, flexShrink: 0 }} />
      {done ? (
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      ) : null}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color: C.text, textDecoration: done ? "line-through" : "none" }}>{ev.title}</span>
          <span style={{ fontFamily: C.display, fontSize: 11, fontWeight: 600, textTransform: "lowercase", color, background: `${color}1f`, padding: "3px 10px", borderRadius: 999 }}>{t(EV_LABEL[ev.type])}</span>
          {done && (
            <span style={{ fontFamily: C.display, fontSize: 11, fontWeight: 700, textTransform: "lowercase", color: C.accent, background: `${C.accent}1f`, padding: "3px 10px", borderRadius: 999 }}>{t("opravljeno")}</span>
          )}
        </div>
        <span style={{ display: "block", fontFamily: C.display, fontWeight: 600, fontSize: 13, color: C.muted, marginTop: 4 }}>{fmtDate(ev.date, lang)} · {ev.time}</span>
      </div>
      <button onClick={onDelete} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}
        style={{ background: "none", border: "none", color: pressed ? C.red : C.muted2, fontSize: 20, cursor: "pointer", padding: 6, transition: "color 0.15s, transform 0.12s", transform: pressed ? "scale(0.85)" : "scale(1)" }}>
        ×
      </button>
    </div>
  );
}

function AddEventForm({ onAdd, onCancel }) {
  const C = useTheme();
  const t = useT();
  const lang = useLang();
  const DAYS = lang === "en" ? DAY_NAMES_EN : DAY_NAMES;
  const openDP = useDatePicker();
  const openTP = useTimePicker();
  const [type, setType] = useState("trening");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(isoOffset(0));
  const [time, setTime] = useState("17:00");
  const submit = () => {
    const fallback = EV_LABEL[type].charAt(0) + EV_LABEL[type].slice(1).toLowerCase();
    onAdd({ type, title: title.trim() || fallback, date, time });
  };
  const inputStyle = { width: "100%", padding: "13px 16px", minHeight: 50, borderRadius: 14, border: "none", background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 16, outline: "none", boxSizing: "border-box", colorScheme: C.name === "dark" ? "dark" : "light" };
  const labelStyle = { display: "block", fontFamily: C.display, fontWeight: 600, fontSize: 13, color: C.muted };
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, marginBottom: 22, animation: "athlosFade 0.2s ease" }}>
      <span style={labelStyle}>{t("TIP")}</span>
      <div style={{ display: "flex", gap: 8, margin: "10px 0 16px" }}>
        {["trening", "tekma", "recovery"].map((ty) => (
          <button key={ty} onClick={() => setType(ty)} style={{ flex: 1, padding: "11px 4px", borderRadius: 999, border: "none", background: type === ty ? `${evColor(C, ty)}26` : C.surface2, color: type === ty ? evColor(C, ty) : C.muted, fontFamily: C.display, fontSize: 12, textTransform: "lowercase", fontWeight: type === ty ? 700 : 500, cursor: "pointer", transition: "background 0.15s, color 0.15s" }}>{t(EV_LABEL[ty])}</button>
        ))}
      </div>
      <span style={labelStyle}>{t("NAZIV")}</span>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("npr. Moč · spodnji del")} style={{ ...inputStyle, marginTop: 8, marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <span style={labelStyle}>{t("DATUM")}</span>
          <button
            onClick={() => openDP && openDP({ value: date, onChange: (v) => setDate(v), futureDays: 14 })}
            style={{
              width: "100%", marginTop: 8, padding: "13px 16px", minHeight: 50,
              borderRadius: 14, border: "none",
              background: C.surface2, color: C.text,
              fontFamily: C.display, fontWeight: 600, fontSize: 14,
              textAlign: "left", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span>{fmtDate(date, lang)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>
            </svg>
          </button>
        </div>
        <div style={{ width: 110 }}>
          <span style={labelStyle}>{t("URA")}</span>
          <button
            onClick={() => openTP && openTP({ value: time, onChange: (v) => setTime(v) })}
            style={{
              width: "100%", marginTop: 8, padding: "13px 16px", minHeight: 50,
              borderRadius: 14, border: "none",
              background: C.surface2, color: C.text,
              fontFamily: C.display, fontWeight: 600, fontSize: 14,
              textAlign: "center", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span>{time}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
            </svg>
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Pressable onClick={onCancel} scale={0.97} style={{ flex: 1, padding: 15, borderRadius: 999, border: `1px solid ${C.border2}`, background: "none", color: C.muted, fontFamily: C.display, fontSize: 14, fontWeight: 600 }}>{t("Prekliči")}</Pressable>
        <PrimaryBtn onClick={submit} style={{ flex: 1 }}>{t("Dodaj")}</PrimaryBtn>
      </div>
    </div>
  );
}

function AiPlanForm({ sport, onPlan, onCancel }) {
  const C = useTheme();
  const t = useT();
  const lang = useLang();
  const DAYS = lang === "en" ? DAY_NAMES_EN : DAY_NAMES;
  const [days, setDays] = useState([0, 2, 4]);
  const [from, setFrom] = useState("16:00");
  const [to, setTo] = useState("20:00");
  const [matchDate, setMatchDate] = useState("");
  const [fillRest, setFillRest] = useState(false);
  const [loading, setLoading] = useState(false);
  const toggleDay = (i) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  const generate = () => {
    if (days.length === 0) return;
    setLoading(true);
    setTimeout(() => {
      const evs = [];
      let id = 1;
      const trainings = ["Moč · spodnji del", "Moč · zgornji del", "Eksplozivnost", "Hitrost + tehnika", "Volumen"];
      let ti = 0;
      for (let off = 0; off < 14; off++) {
        const iso = isoOffset(off);
        const wd = dayIdx(iso);
        const isMatch = matchDate && iso === matchDate;
        const dayBeforeMatch = matchDate && isoOffset(off + 1) === matchDate;
        const dayAfterMatch = matchDate && isoOffset(off - 1) === matchDate;
        if (isMatch) {
          evs.push({ id: id++, date: iso, type: "tekma", title: "Tekma", time: "19:00" });
        } else if (dayAfterMatch) {
          evs.push({ id: id++, date: iso, type: "recovery", title: "Regeneracija po tekmi", time: from });
        } else if (days.includes(wd)) {
          if (dayBeforeMatch) {
            evs.push({ id: id++, date: iso, type: "trening", title: "Aktivacija (pred tekmo)", time: from });
          } else {
            evs.push({ id: id++, date: iso, type: "trening", title: trainings[ti % trainings.length], time: from });
            ti++;
          }
        } else if (fillRest) {
          evs.push({ id: id++, date: iso, type: "recovery", title: mobilityFor(sport), time: from });
        }
      }
      onPlan(evs);
      setLoading(false);
    }, 1100);
  };
  const dateStyle = { width: "100%", marginTop: 8, padding: "13px 16px", minHeight: 50, borderRadius: 14, border: "none", background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 16, outline: "none", boxSizing: "border-box", colorScheme: C.name === "dark" ? "dark" : "light", WebkitAppearance: "none", appearance: "none" };
  const labelStyle = { display: "block", fontFamily: C.display, fontWeight: 600, fontSize: 13, color: C.muted };
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, marginBottom: 22, animation: "athlosFade 0.2s ease" }}>
      <p style={{ margin: "0 0 16px", color: C.text2, fontSize: 14, lineHeight: 1.5 }}>{t("Povej kdaj imaš čas in kdaj je tekma — AI sestavi optimalen 2-tedenski urnik.")}</p>
      <span style={labelStyle}>{t("KATERE DNEVE LAHKO TRENIRAŠ")}</span>
      <div style={{ display: "flex", gap: 6, margin: "10px 0 16px" }}>
        {DAYS.map((dn, i) => {
          const on = days.includes(i);
          return (
            <button key={i} onClick={() => toggleDay(i)} style={{ flex: 1, padding: "11px 0", borderRadius: 999, border: "none", background: on ? C.accent : C.surface2, color: on ? "#04130a" : C.muted, fontFamily: C.display, fontSize: 12, textTransform: "lowercase", cursor: "pointer", fontWeight: on ? 700 : 500, transition: "background 0.15s, color 0.15s" }}>{dn}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={labelStyle}>{t("OD KDAJ")}</span>
          <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} style={dateStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={labelStyle}>{t("DO KDAJ")}</span>
          <input type="time" value={to} onChange={(e) => setTo(e.target.value)} style={dateStyle} />
        </div>
      </div>
      <span style={labelStyle}>{t("DATUM TEKME (NEOBVEZNO)")}</span>
      <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} style={{ ...dateStyle, marginBottom: 16 }} />
      {days.length < 7 && (
        <button onClick={() => setFillRest((v) => !v)}
          style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", padding: 16, marginBottom: 16, borderRadius: 16, cursor: "pointer", border: "none", background: fillRest ? `${C.accent}1a` : C.surface2, transition: "background 0.15s", WebkitTapHighlightColor: "transparent" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1, border: `1.5px solid ${fillRest ? C.accent : C.border2}`, background: fillRest ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
            {fillRest && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </span>
          <span>
            <span style={{ display: "block", fontFamily: C.display, fontWeight: 700, fontSize: 14, color: C.text }}>{t("Izkoristi proste dni")}</span>
            <span style={{ display: "block", color: C.muted, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>
              {t("Na proste dni dodam lahke")} <strong style={{ color: C.text2 }}>{t("raztezne in mobilnostne vaje")}</strong> {t("za")} {sport || t("tvoj šport")}.
            </span>
          </span>
        </button>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <Pressable onClick={onCancel} scale={0.97} style={{ flex: 1, padding: 15, borderRadius: 999, border: `1px solid ${C.border2}`, background: "none", color: C.muted, fontFamily: C.display, fontSize: 14, fontWeight: 600 }}>{t("Prekliči")}</Pressable>
        <PrimaryBtn onClick={generate} style={{ flex: 1, opacity: days.length === 0 ? 0.5 : 1 }}>{loading ? t("Generiram…") : t("Generiraj urnik")}</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Calendar helpers ─────────────────────────────────────────
const MONTHS_SL = ["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getWeekDates(offset = 0) {
  const today = new Date();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startIdx = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  // prev-month trailing days
  for (let i = startIdx - 1; i >= 0; i--) {
    const d = new Date(year, month, 0 - i);
    cells.push({ iso: d.toISOString().slice(0, 10), outside: true });
  }
  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, outside: false });
  }
  // next-month leading days
  let next = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, next++);
    cells.push({ iso: d.toISOString().slice(0, 10), outside: true });
  }
  return cells;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

// ── Load constants ────────────────────────────────────────────
const EV_LOAD = { trening: 480, tekma: 680, recovery: 120 };

// ── Weekly view ───────────────────────────────────────────────
function WeekView({ C, t, lang, weekOffset, setWeekOffset, events, onDelete }) {
  const BAR_LABELS = lang === "en" ? ["M","T","W","T","F","S","S"] : ["P","T","S","Č","P","S","N"];
  const MONTHS_SH = lang === "en"
    ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    : ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Avg","Sep","Okt","Nov","Dec"];
  const DAY_FULL_SL = ["PONEDELJEK","TOREK","SREDA","ČETRTEK","PETEK","SOBOTA","NEDELJA"];
  const DAY_FULL_EN = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
  const DAY_FULL = lang === "en" ? DAY_FULL_EN : DAY_FULL_SL;

  const dates = getWeekDates(weekOffset);
  const today = todayISO();

  const mon = new Date(dates[0] + "T00:00:00");
  const sun = new Date(dates[6] + "T00:00:00");
  const rangeLabel = mon.getMonth() === sun.getMonth()
    ? `${MONTHS_SH[mon.getMonth()]} ${mon.getDate()} – ${sun.getDate()}`
    : `${MONTHS_SH[mon.getMonth()]} ${mon.getDate()} – ${MONTHS_SH[sun.getMonth()]} ${sun.getDate()}`;

  const weekEvs = events.filter(e => dates.includes(e.date));
  const totalLoad = weekEvs.reduce((s, e) => s + (EV_LOAD[e.type] || 0), 0);
  const dayLoads = dates.map(iso => events.filter(e => e.date === iso).reduce((s, e) => s + (EV_LOAD[e.type] || 0), 0));
  const maxLoad = Math.max(...dayLoads, 100);

  const loadStatus = totalLoad === 0 ? t("brez treninga")
    : totalLoad < 1500 ? t("lahka obremenitev")
    : totalLoad < 2800 ? t("optimalen ramp")
    : t("visoka obremenitev");
  const loadColor = totalLoad === 0 ? C.muted
    : totalLoad < 1500 ? C.yellow
    : totalLoad < 2800 ? C.accent
    : C.red;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: C.display, fontWeight: 600, fontSize: 11, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>{t("TEDENSKI LOAD")}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "4px 8px 4px 0", display: "flex", alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 28, color: C.text, letterSpacing: "-0.02em" }}>{rangeLabel}</div>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "4px 0 4px 8px", display: "flex", alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div style={{ fontFamily: C.display, fontSize: 13, color: C.muted, marginTop: 5 }}>
          {t("Planirano")} <strong style={{ color: C.text2 }}>{totalLoad.toLocaleString()} AU</strong>
          {totalLoad > 0 && <> · <span style={{ color: loadColor }}>{loadStatus}</span></>}
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", gap: 5, alignItems: "flex-end", marginBottom: 24 }}>
        {dates.map((iso, i) => {
          const isToday = iso === today;
          const dayEvs = events.filter(e => e.date === iso);
          const load = dayLoads[i];
          const hasEvents = load > 0;
          const CHART_H = 80;
          const barH = hasEvents ? Math.max(Math.round((load / maxLoad) * CHART_H), 14) : 0;
          const BAR_COLORS = ["#7B61FF","#4F8EF0","#2DD4A0","#FF8C42","#4F8EF0","#E8547A","#9B7BFF"];
          const color = dayEvs.some(e => e.type === "tekma") ? "#E8547A"
            : dayEvs.some(e => e.type === "recovery") ? "#2DD4A0"
            : BAR_COLORS[i];
          return (
            <div key={iso} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", height: CHART_H, position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "6px 6px 4px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }} />
                {hasEvents && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barH, borderRadius: "6px 6px 4px 4px", background: color }} />
                )}
              </div>
              <div style={{ fontFamily: C.display, fontWeight: isToday ? 800 : 500, fontSize: 10, color: isToday ? C.accent : C.muted, textTransform: "uppercase" }}>{BAR_LABELS[i]}</div>
            </div>
          );
        })}
      </div>

      {/* Events grouped by day */}
      {dates.map((iso) => {
        const isToday = iso === today;
        const dayEvs = events.filter(e => e.date === iso).sort((a, b) => a.time < b.time ? -1 : 1);
        if (dayEvs.length === 0) return null;
        const hasMatch = dayEvs.some(e => e.type === "tekma");
        return (
          <div key={iso} style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 11, color: C.muted, letterSpacing: "0.07em", marginBottom: 10 }}>
              {DAY_FULL[dayIdx(iso)]}
              {hasMatch && <span style={{ color: C.red, marginLeft: 8 }}>· {t("DAN TEKME")}</span>}
              {isToday && !hasMatch && <span style={{ color: C.accent, marginLeft: 8 }}>· {t("DANES")}</span>}
            </div>
            {dayEvs.map(ev => {
              const load = EV_LOAD[ev.type] || 0;
              const color = evColor(C, ev.type) || C.accent;
              const done = !!ev.completed;
              return (
                <div key={ev.id} style={{ display: "flex", alignItems: "stretch", background: C.surface, border: `1px solid ${done ? `${C.accent}30` : C.border}`, borderRadius: 16, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ width: 4, background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "13px 12px" }}>
                    <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color: C.text }}>{ev.title}</div>
                    <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, marginTop: 3 }}>
                      {ev.time}{ev.type === "tekma" ? ` · ${t("Doma")}` : ""} · Load {load} AU
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", paddingRight: 12, gap: 8 }}>
                    {done && (
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                    {load > 0 && <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color, minWidth: 32, textAlign: "right" }}>{load}</div>}
                    <button onClick={() => onDelete(ev.id)} style={{ background: "none", border: "none", color: C.muted2, fontSize: 20, cursor: "pointer", padding: "4px 2px", lineHeight: 1 }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {weekEvs.length === 0 && (
        <div style={{ fontFamily: C.display, fontSize: 14, color: C.muted2, textAlign: "center", padding: "24px 0" }}>{t("Ta teden ni treningov")}</div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 4, textTransform: "lowercase" }}>
        <Legend color={C.accent} label={t("TRENING")} />
        <Legend color={C.red} label={t("TEKMA")} />
        <Legend color={C.yellow} label={t("REGENERACIJA")} />
      </div>
    </div>
  );
}

// ── Monthly view ──────────────────────────────────────────────
function MonthView({ C, t, lang, monthOffset, setMonthOffset, events, onDelete }) {
  const DAY_LETTERS = lang === "en" ? ["M","T","W","T","F","S","S"] : ["P","T","S","Č","P","S","N"];
  const MONTHS = lang === "en" ? MONTHS_EN : MONTHS_SL;
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(null);

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const cells = getMonthGrid(year, month);

  const selectedEvs = selectedDate
    ? events.filter(e => e.date === selectedDate).sort((a, b) => a.time < b.time ? -1 : 1)
    : [];

  return (
    <div>
      {/* Header: big month name + year + nav arrows */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 34, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{MONTHS[month]}</div>
          <div style={{ fontFamily: C.display, fontWeight: 500, fontSize: 14, color: C.muted, marginTop: 3 }}>{year}</div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 6 }}>
          <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "6px 8px", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center" }}>‹</button>
          <button onClick={() => setMonthOffset(m => m + 1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "6px 8px", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center" }}>›</button>
        </div>
      </div>

      {/* Day letter headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {DAY_LETTERS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontFamily: C.display, fontWeight: 500, fontSize: 12, color: C.muted, padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid — no container box, cells float on page bg */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 20 }}>
        {cells.map(({ iso, outside }, idx) => {
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          const dayEvs = outside ? [] : events.filter(e => e.date === iso);
          const d = new Date(iso + "T00:00:00");
          return (
            <button key={idx} onClick={() => !outside && setSelectedDate(isSelected ? null : iso)} style={{
              background: "none", border: "none", cursor: outside ? "default" : "pointer",
              padding: "10px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              WebkitTapHighlightColor: "transparent",
            }}>
              {/* Date circle */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isToday ? C.text : isSelected ? `${C.accent}28` : "transparent",
              }}>
                <span style={{
                  fontFamily: C.display,
                  fontWeight: isToday ? 700 : 500,
                  fontSize: 14,
                  color: isToday ? C.bg : outside ? C.muted2 : isSelected ? C.accent : C.text,
                }}>
                  {d.getDate()}
                </span>
              </div>
              {/* One dot per event */}
              <div style={{ display: "flex", gap: 2, justifyContent: "center", minHeight: 6 }}>
                {dayEvs.map((ev, ei) => (
                  <span key={ei} style={{
                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                    background: evColor(C, ev.type) || C.accent,
                    display: "inline-block",
                  }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div style={{ marginTop: 4, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 14, color: C.text }}>{fmtDate(selectedDate, lang)}</span>
            {selectedDate === today && <span style={{ fontFamily: C.display, fontSize: 10, fontWeight: 700, color: C.accent, background: `${C.accent}1a`, padding: "2px 8px", borderRadius: 999 }}>{t("danes")}</span>}
          </div>
          {selectedEvs.length === 0
            ? <div style={{ fontFamily: C.display, fontSize: 13, color: C.muted2 }}>{t("Ni treningov")}</div>
            : selectedEvs.map(ev => {
                const load = EV_LOAD[ev.type] || 0;
                const color = evColor(C, ev.type) || C.accent;
                const done = !!ev.completed;
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "stretch", background: C.surface, border: `1px solid ${done ? `${C.accent}30` : C.border}`, borderRadius: 16, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{ width: 4, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "13px 12px" }}>
                      <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color: C.text }}>{ev.title}</div>
                      <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, marginTop: 3 }}>
                        {ev.time} · Load {load} AU
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", paddingRight: 12, gap: 8 }}>
                      {done && <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>}
                      {load > 0 && <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color, minWidth: 32, textAlign: "right" }}>{load}</div>}
                      <button onClick={() => onDelete(ev.id)} style={{ background: "none", border: "none", color: C.muted2, fontSize: 20, cursor: "pointer", padding: "4px 2px", lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

export default function ScreenSeason({ profile, user }) {
  const C = useTheme();
  const t = useT();
  const lang = useLang();
  const [mode, setMode] = useState("list");       // "list" | "add" | "ai"
  const [calView, setCalView] = useState("week"); // "week" | "month"
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await listEvents(user?.id);
        if (alive && Array.isArray(list)) setEvents(list);
      } catch {}
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const onAdd = async (ev) => {
    setMode("list");
    try {
      const saved = await addEvent(user?.id, ev);
      setEvents((e) => [...e, saved]);
    } catch {
      setEvents((e) => [...e, { ...ev, id: Date.now() }]);
    }
  };

  const onDelete = (id) => {
    setEvents((list) => list.filter((x) => x.id !== id));
    deleteEvent(user?.id, id).catch(() => {});
  };

  const onPlan = async (evs) => {
    setMode("list");
    try {
      const saved = await replaceEvents(user?.id, evs);
      setEvents(saved);
    } catch {
      setEvents(evs);
    }
  };

  return (
    <div style={{ padding: "10px 18px 28px" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 26, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>{t("Tvoj urnik")}</h2>
        {/* Week / Month toggle */}
        <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: 3 }}>
          {["week","month"].map(v => (
            <button key={v} onClick={() => setCalView(v)} style={{
              padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer",
              background: calView === v ? C.accent : "transparent",
              color: calView === v ? "#04130a" : C.muted,
              fontFamily: C.display, fontWeight: 700, fontSize: 12, transition: "background 0.15s",
            }}>
              {v === "week" ? t("Teden") : t("Mesec")}
            </button>
          ))}
        </div>
      </header>

      {/* Add / AI buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <Pressable onClick={() => setMode(mode === "add" ? "list" : "add")} scale={0.97} style={{ flex: 1, padding: "13px", borderRadius: 999, border: `1px solid ${C.border2}`, background: mode === "add" ? C.surface2 : "none", color: C.text, fontFamily: C.display, fontSize: 14, fontWeight: 600 }}>{t("+ Dodaj sam")}</Pressable>
        <Pressable onClick={() => setMode(mode === "ai" ? "list" : "ai")} scale={0.97} style={{ flex: 1, padding: "13px", borderRadius: 999, border: "none", background: mode === "ai" ? C.accent : `${C.accent}1c`, color: mode === "ai" ? "#ffffff" : C.accent, fontFamily: C.display, fontSize: 14, fontWeight: 700 }}>{t("AI urnik")}</Pressable>
      </div>

      {mode === "add" && <AddEventForm onAdd={onAdd} onCancel={() => setMode("list")} />}
      {mode === "ai" && <AiPlanForm sport={profile?.sport} onPlan={onPlan} onCancel={() => setMode("list")} />}

      {!loaded && <div style={{ fontFamily: C.display, fontSize: 14, color: C.muted2, textAlign: "center", padding: 32 }}>{t("Nalagam…")}</div>}

      {loaded && calView === "week" && (
        <WeekView C={C} t={t} lang={lang} weekOffset={weekOffset} setWeekOffset={setWeekOffset} events={events} onDelete={onDelete} />
      )}
      {loaded && calView === "month" && (
        <MonthView C={C} t={t} lang={lang} monthOffset={monthOffset} setMonthOffset={setMonthOffset} events={events} onDelete={onDelete} />
      )}
    </div>
  );
}
