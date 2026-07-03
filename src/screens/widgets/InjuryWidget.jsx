import React, { useState } from "react";
import { Mono } from "../../components/UI";

// Per spec (ATHLOS-dodatki-spec.pdf, §02 · Poškodba):
// Sits directly below the readiness medallion. Completely hidden when there's
// no active injury — never shows an empty "0 injuries" placeholder.
//
// injury shape: { name, phase: 0-3, progressNote, returnWeeks, returnDate, coachNote? }
const PHASES = ["Akutno", "Protokol", "Re-load", "Return"];

export default function InjuryWidget({ injury, C, t, isCoach = false }) {
  const [coachView, setCoachView] = useState(false);

  if (!injury) return null;

  const showCoachNote = isCoach && coachView && injury.coachNote;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.red}40`, borderRadius: 20, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Mono style={{ color: C.red, fontSize: 9, letterSpacing: "0.12em" }}>{t("AKTIVNA POŠKODBA")}</Mono>
        {isCoach && (
          <button
            onClick={() => setCoachView((v) => !v)}
            style={{ fontFamily: C.display, fontSize: 11, color: C.muted, background: "none", border: `1px solid ${C.border2}`, borderRadius: 999, padding: "4px 10px", cursor: "pointer" }}
          >
            {coachView ? t("Pogled trenerja") : t("Pogled igralca")}
          </button>
        )}
      </div>

      <h3 style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 18, color: C.text, margin: "0 0 12px" }}>{t(injury.name)}</h3>

      {/* 4-phase stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        {PHASES.map((label, i) => (
          <React.Fragment key={label}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: i === 0 || i === PHASES.length - 1 ? "0 0 auto" : 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: i <= injury.phase ? C.red : C.surface3,
                border: `1px solid ${i <= injury.phase ? C.red : C.border2}`,
                color: i <= injury.phase ? "#fff" : C.muted,
                fontFamily: C.mono, fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <Mono style={{ color: i === injury.phase ? C.red : C.muted2, fontSize: 8, marginTop: 4, whiteSpace: "nowrap" }}>{t(label)}</Mono>
            </div>
            {i < PHASES.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < injury.phase ? C.red : C.border, margin: "0 4px 14px" }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <p style={{ fontFamily: C.display, fontSize: 13, color: C.text2, margin: "0 0 8px" }}>{t(injury.progressNote)}</p>
      <Mono style={{ color: C.muted, fontSize: 10 }}>
        {t("Pričakovana vrnitev")}: {injury.returnWeeks} {t("tedne")} · {t(injury.returnDate)}
      </Mono>

      {showCoachNote && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: C.surface3, border: `1px solid ${C.border}` }}>
          <Mono style={{ color: C.muted, fontSize: 8, letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>{t("INTERNE OPOMBE")}</Mono>
          <p style={{ fontFamily: C.display, fontSize: 12, color: C.text2, margin: 0 }}>{injury.coachNote}</p>
        </div>
      )}
    </div>
  );
}
