import React from "react";
import { useTheme } from "../theme";
import { BackBtn } from "../components/UI";
import { useT } from "../lib/i18n";

export default function ScreenReport({ go }) {
  const C = useTheme();
  const t = useT();
  return (
    <div style={{ padding: "10px 18px 28px", color: C.text }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <BackBtn onClick={() => go("today")} />
        <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted }}>{t("DNEVNO POROČILO")}</span>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
        <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted }}>{t("POTEČE ČEZ")}</span>
        <span style={{ fontFamily: C.mono, fontSize: 15.5, color: C.text }}>11:04:35</span>
      </div>

      <div style={{ marginBottom: 18 }}>
        <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13.5, color: C.muted }}>{t("TRENING")} #14</span>
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 28, margin: "6px 0 0", letterSpacing: "-0.02em", color: C.text }}>{t("Moč · Spodnji del")}</h2>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, marginBottom: 14 }}>
        <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted }}>{t("SKUPNA OCENA")}</span>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 8 }}>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 67, lineHeight: 0.85, color: C.accent, letterSpacing: "-0.03em" }}>92</div>
          <div style={{ paddingBottom: 8 }}>
            <span style={{ color: C.muted, fontFamily: C.display, fontWeight: 700 }}>/100</span>
            <div style={{ color: C.accent, fontFamily: C.display, fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>{t("odlično")}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {[["8.6", "T", t("DVIGNJENO"), "+0.5T"], ["7.2", "/10", t("TEŽAVNOST"), t("OPTIMALNO")], ["6", "/6", t("OPRAVLJENE VAJE"), t("VSE")]].map(([v, u, l, s], i) => (
          <div key={i} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 10px", textAlign: "center" }}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12.5, color: C.muted }}>{l}</span>
            <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 29, color: C.accent, margin: "8px 0 6px", letterSpacing: "-0.02em" }}>{v}<span style={{ fontSize: 14.5 }}>{u}</span></div>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12.5, color: C.muted }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, marginBottom: 14 }}>
        <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted, display: "block", marginBottom: 12 }}>{t("AI ANALIZA")}</span>
        <p style={{ margin: 0, color: C.text2, fontSize: 15.5, lineHeight: 1.5 }}>{t("Močan trening. Povečaj breme za 2.5 kg na počepu naslednji teden. Tehnika je stabilna — idealen čas za napredovanje.")}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <span style={{ padding: "7px 13px", borderRadius: 999, background: C.name === "dark" ? "#4DFFA6" : "#2E9E6B", color: C.name === "dark" ? "#0A1A10" : "#FFFFFF", fontFamily: C.display, fontWeight: 800, fontSize: 13.5 }}>+5 {t("KG / TEDEN")}</span>
          <span style={{ padding: "7px 13px", borderRadius: 999, background: C.surface2, border: `1px solid ${C.border}`, color: C.text2, fontFamily: C.display, fontWeight: 600, fontSize: 13.5 }}>{t("TEHNIKA STABILNA")}</span>
          <span style={{ padding: "7px 13px", borderRadius: 999, background: C.surface2, border: `1px solid ${C.border}`, color: C.text2, fontFamily: C.display, fontWeight: 600, fontSize: 13.5 }}>{t("FOKUS: HITROST")}</span>
        </div>
      </div>

      <button onClick={() => go("assessment")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, cursor: "pointer", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: `${C.accent}18`, border: `1px solid ${C.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 20V12M8 20V8M12 20V4M16 20V10M20 20V6" />
          </svg>
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text }}>{t("Performans ocena")}</span>
          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>{t("Benchmark primerjava · trenerjev komentar")}</span>
        </span>
        <span style={{ color: C.muted }}>›</span>
      </button>
    </div>
  );
}
