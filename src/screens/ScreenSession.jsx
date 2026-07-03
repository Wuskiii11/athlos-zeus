import React from "react";
import { useTheme } from "../theme";
import { Mono, Kicker, PrimaryBtn, BackBtn } from "../components/UI";
import { useT } from "../lib/i18n";

export default function ScreenSession({ go }) {
  const C = useTheme();
  const t = useT();
  return (
    <div style={{ padding: "8px 20px 24px" }}>
      <header style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
        <BackBtn onClick={() => go("train")} />
        <div>
          <Kicker>{t("TRENING V ŽIVO")}</Kicker>
          <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 24, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>{t("Počep")} — {t("serija")} 3/5</h2>
        </div>
      </header>

      <button style={{ width: "100%", height: 180, borderRadius: 16, border: `1px solid ${C.border}`, background: C.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18, cursor: "pointer" }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", border: `1px solid ${C.accent}`, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <Mono style={{ color: C.muted }}>{t("POSNEMI VAJO ZA ANALIZO")}</Mono>
      </button>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <Mono style={{ color: C.muted }}>{t("SERIJA 3 OD 5")}</Mono>
          <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 14, color: C.text }}>{t("CILJ")} 82.5 KG ✓</span>
        </div>
        {[[t("TEŽA"), "82.5 KG", 72], [t("PONOVITVE"), "3", 50], [t("TEŽAVNOST"), "7.5 / 10", 78]].map(([l, v, w], i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <Mono style={{ color: C.muted, fontSize: 10 }}>{l}</Mono>
              <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 13, color: C.text }}>{v}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: C.surface3 }}>
              <div style={{ width: `${w}%`, height: "100%", borderRadius: 3, background: C.accent }} />
            </div>
          </div>
        ))}
        <PrimaryBtn style={{ marginTop: 8 }}>{t("Zabeleži serijo")}</PrimaryBtn>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <Mono style={{ color: C.accent }}>AI</Mono>
        <span style={{ color: C.text2, fontSize: 13, lineHeight: 1.5 }}>{t("Tvoja izvedba je stabilna in hitra. Kar tako naprej — tehnika je odlična.")}</span>
      </div>
    </div>
  );
}
