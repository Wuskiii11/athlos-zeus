import React, { useState, useEffect } from "react";
import { useTheme } from "../theme";
import { Mono } from "./UI";
import { useLang, useT } from "../lib/i18n";
import WheelColumn from "./WheelPicker";

const MONTHS_SL = ["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

const MIN_AGE = 10; // person must be at least 10 years old

function getMaxDate() {
  const d = new Date();
  return new Date(d.getFullYear() - MIN_AGE, d.getMonth(), d.getDate());
}

/* ── Future-only day picker (urnik) ── */
const DAYS_SL_SHORT = ["ned","pon","tor","sre","čet","pet","sob"];
const DAYS_EN_SHORT = ["sun","mon","tue","wed","thu","fri","sat"];
const MONTHS_SL_SHORT = ["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"];
const MONTHS_EN_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function FutureDatePicker({ value, onChange, onClose, futureDays }) {
  const C = useTheme();
  const t = useT();
  const lang = useLang();
  const daysShort = lang === "en" ? DAYS_EN_SHORT : DAYS_SL_SHORT;
  const monthsShort = lang === "en" ? MONTHS_EN_SHORT : MONTHS_SL_SHORT;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: futureDays + 1 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const toISO = (d) => d.toISOString().slice(0, 10);
  const [sel, setSel] = useState(value || toISO(today));

  const confirm = () => { onChange(sel); onClose(); };

  const fmtSel = () => {
    const d = new Date(sel + "T00:00:00");
    return `${d.getDate()}. ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <style>{`@keyframes dpUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: "26px 26px 0 0", border: `1px solid ${C.border2}`, borderBottom: "none", overflow: "hidden", animation: "dpUp 0.3s cubic-bezier(.2,.8,.2,1)" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border2 }} />
        </div>
        {/* Selected label */}
        <div style={{ padding: "4px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
          <Mono style={{ color: C.gold, fontSize: 8, letterSpacing: "0.22em" }}>{t("IZBRANI DATUM")}</Mono>
          <div style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 19, color: sel ? C.text : C.muted, marginTop: 4 }}>{fmtSel()}</div>
        </div>
        {/* Day grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, padding: "14px 10px 10px" }}>
          {days.map((d, i) => {
            const iso = toISO(d);
            const active = sel === iso;
            const isToday = i === 0;
            return (
              <button
                key={iso}
                onClick={() => setSel(iso)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 4, padding: "8px 2px", borderRadius: 12,
                  border: active ? "none" : isToday ? `1.5px solid ${C.gold}66` : `1.5px solid transparent`,
                  background: active ? C.btn : "transparent",
                  cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  transition: "background 0.12s, transform 0.1s",
                }}
              >
                <span style={{ fontFamily: C.mono, fontSize: 8, color: active ? C.btnText : C.muted, letterSpacing: "0.06em" }}>
                  {daysShort[d.getDay()].toUpperCase()}
                </span>
                <span style={{ fontFamily: C.display, fontWeight: active ? 800 : isToday ? 700 : 400, fontSize: 15, color: active ? C.btnText : C.text, lineHeight: 1 }}>
                  {d.getDate()}
                </span>
                {isToday && !active && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.gold }} />
                )}
              </button>
            );
          })}
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 10, padding: "8px 16px 28px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, fontSize: 14, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>{t("Prekliči")}</button>
          <button onClick={confirm} style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: C.btn, color: C.btnText, fontFamily: C.heading, fontWeight: 700, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>{t("Potrdi")}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main DatePicker — iOS-style sliding wheel (day / month / year) ── */
function BirthDatePicker({ value, onChange, onClose }) {
  const C = useTheme();
  const t = useT();
  const lang = useLang();
  const months = lang === "en" ? MONTHS_EN : MONTHS_SL;
  const maxDate = getMaxDate();
  const init = value ? new Date(value) : maxDate;

  const startY = 1940;
  const endY = maxDate.getFullYear();
  const years = Array.from({ length: endY - startY + 1 }, (_, i) => startY + i);
  const monthIdxs = Array.from({ length: 12 }, (_, i) => i);

  const [day, setDay] = useState(init.getDate());
  const [month, setMonth] = useState(init.getMonth());
  const [year, setYear] = useState(Math.min(init.getFullYear(), endY));

  const dim = daysInMonth(year, month);
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  // Clamp day when the month/year combo shortens it (e.g. 31 → 28/29/30)
  useEffect(() => { if (day > dim) setDay(dim); }, [dim]); // eslint-disable-line
  // Clamp month/day so the date never goes past maxDate (min-age limit)
  useEffect(() => { if (year === endY && month > maxDate.getMonth()) setMonth(maxDate.getMonth()); }, [year]); // eslint-disable-line
  useEffect(() => { if (year === endY && month === maxDate.getMonth() && day > maxDate.getDate()) setDay(maxDate.getDate()); }, [year, month]); // eslint-disable-line

  const sel = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const confirm = () => { onChange(sel); onClose(); };

  const fmtSel = () => {
    const d = new Date(sel);
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      <style>{`@keyframes dpUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", zIndex: 1, background: C.bg, borderRadius: "26px 26px 0 0", border: `1px solid ${C.border2}`, borderBottom: "none", overflow: "hidden", animation: "dpUp 0.3s cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border2 }} />
        </div>

        {/* Selected date label */}
        <div style={{ padding: "4px 20px 12px", borderBottom: `1px solid ${C.border}` }}>
          <Mono style={{ color: C.gold, fontSize: 8, letterSpacing: "0.22em" }}>{t("IZBRANI DATUM")}</Mono>
          <div style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 19, color: C.text, marginTop: 4 }}>
            {fmtSel()}
          </div>
        </div>

        {/* Sliding wheel columns — day / month / year */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: "10px 14px" }}>
          <WheelColumn items={days} value={day} onChange={setDay} width={56} C={C} />
          <WheelColumn items={monthIdxs} value={month} onChange={setMonth} width={128} C={C} render={(m) => months[m]} />
          <WheelColumn items={years} value={year} onChange={setYear} width={72} C={C} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, padding: "8px 16px 28px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, fontSize: 14, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
            {t("Prekliči")}
          </button>
          <button onClick={confirm} style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: C.btn, color: C.btnText, fontFamily: C.heading, fontWeight: 700, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", transition: "background 0.2s", WebkitTapHighlightColor: "transparent" }}>
            {t("Potrdi")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DatePicker({ value, onChange, onClose, futureDays }) {
  if (futureDays != null) return <FutureDatePicker value={value} onChange={onChange} onClose={onClose} futureDays={futureDays} />;
  return <BirthDatePicker value={value} onChange={onChange} onClose={onClose} />;
}
