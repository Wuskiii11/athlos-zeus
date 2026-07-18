import React from "react";
import { useTheme } from "../theme";
import { Mono } from "../components/UI";

export default function ConsentScreen({ onAccept, onReject }) {
  const C = useTheme();

  return (
    <div className="app-fullscreen" style={{
      // top+bottom so it fills the whole phone shell (no empty strip at the
      // bottom on mobile, where 100dvh can be shorter than the shell)
      position: "fixed", inset: 0,
      background: C.bg,
      display: "flex", flexDirection: "column",
      paddingTop: "env(safe-area-inset-top, 44px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* Title */}
      <div style={{ padding: "16px 24px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, textAlign: "center" }}>
        <Mono style={{ color: C.muted, fontSize: 11 }}>ATHLOS · PERSONALIZACIJA</Mono>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "20px 22px 8px" }}>
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 24.5, color: C.text, margin: "0 0 16px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
          Upravljaj svoje izbire
        </h2>

        <p style={{ color: C.text2, fontSize: 14.5, lineHeight: 1.65, margin: "0 0 14px", fontFamily: C.display }}>
          Da ti lahko zagotovimo najboljšo izkušnjo, ATHLOS d.o.o. uporablja določene tehnologije za personalizacijo vsebin, analitiko in varnost aplikacije.
        </p>

        <p style={{ color: C.text2, fontSize: 14.5, lineHeight: 1.65, margin: "0 0 14px", fontFamily: C.display }}>
          Nekatera od teh so <span style={{ color: C.text, fontWeight: 600 }}>obvezna</span> — brez njih aplikacija ne more delovati. Ostale so opcijske in nam pomagajo izboljšati storitev.
        </p>

        {[
          { title: "Nujno potrebne tehnologije", body: "Omogočajo osnovno delovanje aplikacije: prijavo, varno sejo in shranjevanje tvojih podatkov o treningih.", required: true },
          { title: "Analitika in izboljšave", body: "Analiziramo, kako uporabljaš ATHLOS, da izboljšamo funkcije in odpravljamo napake. Podatki so anonimizirani." },
          { title: "Personalizirana priporočila", body: "Na podlagi tvojih podatkov ti generiramo prilagojene treninge in prehransko svetovanje." },
        ].map(s => (
          <div key={s.title} style={{ padding: "14px 0", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text }}>{s.title}</span>
              {s.required && <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.1em", color: "#000", background: C.accent, padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>OBVEZNO</span>}
            </div>
            <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.6, margin: 0, fontFamily: C.display }}>{s.body}</p>
          </div>
        ))}

        <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.6, margin: "14px 0 0", fontFamily: C.display, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          Svojo izbiro lahko kadar koli spreminjaš v <span style={{ color: C.text }}>Nastavitve → Zasebnost</span>.
        </p>
      </div>

      {/* Buttons */}
      <div style={{ flexShrink: 0, padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: C.bg, display: "flex", gap: 10 }}>
        <button onClick={onReject} style={{ flex: 1, padding: "15px", borderRadius: 12, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, fontSize: 15.5, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          Zavrni vse
        </button>
        <button onClick={onAccept} style={{ flex: 2, padding: "15px", borderRadius: 12, border: "none", background: C.accent, color: "#000", fontFamily: C.display, fontWeight: 800, fontSize: 15.5, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          Sprejmi vse
        </button>
      </div>

      <div style={{ padding: "10px 16px", paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)", textAlign: "center", flexShrink: 0 }}>
        <button onClick={onAccept} style={{ background: "none", border: "none", color: C.accent, fontFamily: C.display, fontWeight: 600, fontSize: 14.5, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
          Prilagodi svoje izbire
        </button>
      </div>
    </div>
  );
}
