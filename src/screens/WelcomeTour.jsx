import React, { useState } from "react";
import { useTheme } from "../theme";
import { Icon } from "../components/UI";

// Shown once after the athlete's first login — a quick tour of the app:
// what it does and where everything lives. Dismissed → never shown again
// on this device (per account).
const SLIDES = [
  {
    icon: "today",
    title: "Welcome to ATHLOS",
    desc: "Your day starts on Today: do the morning check-in and get your readiness score — the app tells you how hard to go.",
  },
  {
    icon: "calendar",
    title: "Plan your season",
    desc: "The Calendar holds your trainings, matches and recovery. The weekly load chart shows how much you've planned.",
  },
  {
    icon: "ai",
    title: "Your AI coach",
    desc: "Tap the ATHLOS logo any time. It knows your sport, your goals and your data — ask it for trainings, meals or advice.",
  },
  {
    icon: "chat",
    title: "Join your club",
    desc: "In Community, search your club or your coach's username and join — you get the club chat and your coach sees your readiness.",
  },
  {
    icon: "profile",
    title: "Make it yours",
    desc: "Profile holds your stats, photo, plan and settings. That's it — let's train.",
  },
];

export default function WelcomeTour({ onDone }) {
  const C = useTheme();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200, background: C.bg,
      display: "flex", flexDirection: "column", color: C.text,
      padding: "calc(env(safe-area-inset-top, 20px) + 16px) 28px calc(env(safe-area-inset-bottom, 0px) + 24px)",
    }}>
      <button
        onClick={onDone}
        style={{ alignSelf: "flex-end", background: "none", border: "none", color: C.muted, fontFamily: C.display, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 6 }}
      >
        Skip
      </button>

      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", animation: "athlosFade 0.35s ease" }}>
        <div style={{
          width: 86, height: 86, borderRadius: 19,
          background: `${C.accent}14`, border: `1px solid ${C.accent}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18, boxShadow: C.glowSoft,
        }}>
          <Icon name={s.icon} color={C.accent} size={40} />
        </div>
        <h1 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 26, margin: "0 0 9px", letterSpacing: "-0.02em" }}>{s.title}</h1>
        <p style={{ fontFamily: C.display, fontSize: 13.5, lineHeight: 1.6, color: C.text2, margin: 0, maxWidth: 320 }}>{s.desc}</p>
      </div>

      {/* dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 15 }}>
        {SLIDES.map((_, d) => (
          <span key={d} style={{
            width: d === i ? 22 : 7, height: 7, borderRadius: 999,
            background: d === i ? C.accent : C.border2,
            transition: "all 0.25s ease",
          }} />
        ))}
      </div>

      <button
        onClick={() => (last ? onDone() : setI(i + 1))}
        style={{
          width: "100%", padding: "11px", borderRadius: 999, border: "none",
          background: C.btn, color: C.btnText, fontFamily: C.display,
          fontWeight: 800, fontSize: 14, cursor: "pointer",
          boxShadow: C.glow, WebkitTapHighlightColor: "transparent",
        }}
      >
        {last ? "Let's go" : "Next"}
      </button>
    </div>
  );
}
