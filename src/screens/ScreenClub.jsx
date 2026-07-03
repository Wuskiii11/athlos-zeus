import React, { useState } from "react";
import { useTheme } from "../theme";
import { Mono } from "../components/UI";
import { useT } from "../lib/i18n";
import InjuryWidget from "./widgets/InjuryWidget";

const TEAM = [
  { ini: "LK", name: "Luka Kovač",      pos: "Napadalec",   battery: 82, injury: { name: "Hamstring gr. II", phase: 1, progressNote: "RICE protokol, izolirana aktivacija.", returnWeeks: 3, returnDate: "do 15. jul" }, days: [1, 1, 0, 1, 1, 0, 1], sprint: "1.76s", squat: "140 kg" },
  { ini: "NM", name: "Nina Mlakar",      pos: "Vezna igra",  battery: 91, injury: null, days: [1, 1, 1, 0, 1, 1, 1], sprint: "1.81s", squat: "95 kg" },
  { ini: "TŽ", name: "Tim Žagar",        pos: "Branilec",    battery: 65, injury: { name: "Bolečina v kolenu", phase: 2, progressNote: "Začetek re-load protokola.", returnWeeks: 2, returnDate: "do 10. jul" }, days: [1, 0, 0, 1, 0, 1, 1], sprint: "1.84s", squat: "128 kg" },
  { ini: "EH", name: "Eva Horvat",       pos: "Vezna igra",  battery: 88, injury: null, days: [1, 1, 1, 1, 0, 1, 1], sprint: "1.79s", squat: "102 kg" },
  { ini: "JN", name: "Jure Novak",       pos: "Vratar",      battery: 73, injury: null, days: [1, 1, 0, 0, 1, 1, 1], sprint: "1.91s", squat: "115 kg" },
  { ini: "AK", name: "Ana Kos",          pos: "Branilec",    battery: 94, injury: null, days: [1, 1, 1, 1, 1, 0, 1], sprint: "1.74s", squat: "98 kg" },
  { ini: "MP", name: "Marko Potočnik",   pos: "Napadalec",   battery: 56, injury: { name: "Zvit gleženj gr. I", phase: 0, progressNote: "Akutna faza — RICE.", returnWeeks: 1, returnDate: "za 1 teden" }, days: [0, 0, 0, 1, 0, 0, 0], sprint: "1.88s", squat: "122 kg" },
];

const DAY_LABELS = ["P", "T", "S", "Č", "P", "S", "N"];

function BatteryBar({ pct, C }) {
  const col = pct >= 70 ? C.accent : pct >= 40 ? (C.yellow || "#f59e0b") : (C.red || "#ef4444");
  return (
    <div style={{ height: 5, borderRadius: 999, background: C.surface3, overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 999, transition: "width 0.6s ease" }} />
    </div>
  );
}

function AthleteDetailSheet({ athlete, C, t, onClose, go }) {
  const batCol = athlete.battery >= 70 ? C.accent : athlete.battery >= 40 ? (C.yellow || "#f59e0b") : (C.red || "#ef4444");
  const lastTraining = [
    { name: "Počep", sets: 4, reps: 5, load: "120 kg" },
    { name: "Skok na zaboj", sets: 3, reps: 3, load: "60 cm" },
    { name: "Köbenhavnska deska", sets: 3, reps: "30s", load: "—" },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20, background: C.bg, display: "flex", flexDirection: "column", animation: "athlosFade 0.2s ease", overflowY: "auto" }}>
      {/* header */}
      <div style={{ padding: "12px 18px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>←</button>
        <span style={{ width: 42, height: 42, borderRadius: "50%", background: `${C.accent}1f`, border: `1.5px solid ${C.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontWeight: 800, color: C.accent, fontSize: 15, flexShrink: 0 }}>{athlete.ini}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 17, color: C.text }}>{athlete.name}</div>
          <Mono style={{ color: C.muted, fontSize: 9 }}>{t(athlete.pos)}</Mono>
        </div>
        <button onClick={() => { onClose(); go("chat"); }} style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.text2, fontFamily: C.display, fontWeight: 700, fontSize: 12, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>💬</button>
      </div>

      <div style={{ flex: 1, padding: "18px 18px 28px" }}>
        {/* battery */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Mono style={{ color: C.muted, fontSize: 9, letterSpacing: "0.1em" }}>{t("READINESS · BATERIJA")}</Mono>
            <span style={{ padding: "3px 9px", borderRadius: 999, background: `${batCol}1f`, border: `1px solid ${batCol}55` }}>
              <Mono style={{ color: batCol, fontSize: 8 }}>{athlete.battery >= 70 ? "READY" : athlete.battery >= 40 ? "CAUTION" : "REST"}</Mono>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 34, color: batCol, letterSpacing: "-0.02em" }}>{athlete.battery}</span>
            <span style={{ fontFamily: C.mono, fontSize: 12, color: C.muted }}>/100</span>
          </div>
          <BatteryBar pct={athlete.battery} C={C} />
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {[["Sprint", athlete.sprint], ["Počep 1RM", athlete.squat]].map(([l, v]) => (
              <div key={l}>
                <Mono style={{ color: C.muted, fontSize: 8 }}>{t(l.toUpperCase())}</Mono>
                <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 14, color: C.text, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* injury */}
        {athlete.injury && (
          <div style={{ marginBottom: 14 }}>
            <InjuryWidget injury={athlete.injury} C={C} t={t} isCoach={true} />
          </div>
        )}

        {/* 7-day history */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
          <Mono style={{ color: C.muted, fontSize: 9, letterSpacing: "0.1em", display: "block", marginBottom: 12 }}>{t("ZADNJIH 7 DNI")}</Mono>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {athlete.days.map((d, i) => {
              const col = d === 1 ? C.accent : (C.muted2 || C.muted);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: d === 1 ? `${C.accent}20` : C.surface3, border: `1.5px solid ${d === 1 ? C.accent : C.border2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {d === 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  </div>
                  <Mono style={{ color: col, fontSize: 7 }}>{DAY_LABELS[i]}</Mono>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {[[athlete.days.filter(d => d === 1).length, t("Treningov"), C.accent], [athlete.days.filter(d => d === 0).length, t("Počitek"), C.muted]].map(([v, l, col]) => (
              <div key={l}>
                <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: col }}>{v}</span>
                <Mono style={{ color: C.muted, fontSize: 8, marginLeft: 4 }}>{l}</Mono>
              </div>
            ))}
          </div>
        </div>

        {/* last training */}
        <Mono style={{ color: C.muted, fontSize: 9, letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>{t("ZADNJI TRENING")}</Mono>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "6px 16px", marginBottom: 16 }}>
          {lastTraining.map((ex, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: i < lastTraining.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: C.surface3, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontWeight: 700, fontSize: 10, color: C.muted, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{t(ex.name)}</span>
              <Mono style={{ color: C.muted, fontSize: 9 }}>{ex.sets}×{ex.reps}</Mono>
              <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 13, color: C.text2, marginLeft: 6 }}>{ex.load}</span>
            </div>
          ))}
        </div>

        {/* assessment CTA */}
        <button onClick={() => { onClose(); go("assessment"); }} style={{ width: "100%", padding: "16px", borderRadius: 999, border: "none", background: C.btn, color: C.btnText, fontFamily: C.display, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: "0.04em", WebkitTapHighlightColor: "transparent" }}>
          📊 {t("Performans ocena")}
        </button>
      </div>
    </div>
  );
}

export default function ScreenClub({ go, profile }) {
  const C = useTheme();
  const t = useT();
  const club = profile.club || "NK Domžale";
  const [detail, setDetail] = useState(null);

  return (
    <div style={{ padding: "10px 18px 28px", color: C.text }}>
      <Mono style={{ color: C.accent, fontSize: 9, letterSpacing: "0.14em" }}>ATHLETE OS</Mono>
      <h1 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 27, margin: "8px 0 18px", letterSpacing: "-0.02em" }}>{t("Klub")}</h1>

      {/* club card */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, marginBottom: 18 }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: `${C.accent}1a`, border: `1px solid ${C.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏆</span>
        <div>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18 }}>{club}</div>
          <Mono style={{ color: C.muted, fontSize: 9 }}>U17 · {TEAM.length} {t("članov")}</Mono>
        </div>
      </div>

      {/* coach */}
      <Mono style={{ color: C.muted, fontSize: 9, marginBottom: 8, display: "block" }}>{t("TRENER")}</Mono>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 18 }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.accent}1f`, border: `1px solid ${C.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontWeight: 800, color: C.accent }}>M</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 14 }}>Coach Matej</div>
          <Mono style={{ color: C.muted, fontSize: 9 }}>{t("Glavni trener")}</Mono>
        </div>
      </div>

      {/* team */}
      <Mono style={{ color: C.muted, fontSize: 9, marginBottom: 8, display: "block" }}>{t("EKIPA")}</Mono>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TEAM.map((member, i) => {
          const batCol = member.battery >= 70 ? C.accent : member.battery >= 40 ? (C.yellow || "#f59e0b") : (C.red || "#ef4444");
          return (
            <button key={i} onClick={() => setDetail(member)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: "pointer", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: C.surface3, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontWeight: 700, fontSize: 12, color: C.muted, flexShrink: 0 }}>{member.ini}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{member.name}</span>
                <Mono style={{ color: C.muted, fontSize: 8 }}>{t(member.pos)}</Mono>
              </span>
              {member.injury && <span style={{ fontSize: 13 }}>🤕</span>}
              <div style={{ textAlign: "right", minWidth: 40 }}>
                <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 14, color: batCol }}>{member.battery}</div>
                <Mono style={{ color: C.muted, fontSize: 7 }}>BAT</Mono>
              </div>
              <span style={{ color: C.muted, marginLeft: 2 }}>›</span>
            </button>
          );
        })}
      </div>

      {detail && (
        <AthleteDetailSheet athlete={detail} C={C} t={t} onClose={() => setDetail(null)} go={go} />
      )}
    </div>
  );
}
