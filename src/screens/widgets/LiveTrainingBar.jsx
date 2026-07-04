import React, { useEffect, useState } from "react";
import { Mono } from "../../components/UI";
import { getLive, subscribeLive, fmtElapsed } from "../../lib/liveSession";

// Per spec (ATHLOS-dodatki-spec.pdf, §07 · Live trening widget):
// the in-app equivalent of a lock-screen Live Activity. While a workout is
// running, a dark sticky bar shows the current exercise, set, load and the
// session timer on EVERY tab; tapping it jumps straight back to the workout
// (spec: "tap odpre app točno na ekranu trenutne vaje").
export function useLiveSession() {
  const [live, setLiveState] = useState(getLive);
  useEffect(() => subscribeLive(setLiveState), []);
  return live;
}

export default function LiveTrainingBar({ C, t, onOpen }) {
  const live = useLiveSession();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [live]);

  if (!live) return null;

  const restLeft = live.resting && live.restUntil ? Math.max(0, Math.ceil((live.restUntil - Date.now()) / 1000)) : 0;

  return (
    <button onClick={onOpen} style={{
      width: "100%", maxWidth: 560, marginInline: "auto", marginBottom: 8,
      display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
      background: "linear-gradient(160deg, #1f2420, #14120e)",
      border: `1px solid ${C.accent2}40`, borderRadius: 18,
      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
      cursor: "pointer", textAlign: "left", pointerEvents: "auto",
      animation: "athlosSlideDown 0.3s ease", WebkitTapHighlightColor: "transparent",
      position: "relative", overflow: "hidden",
    }}>
      {/* signal-tinted "oracle" halo, same language as the AI panels */}
      <span aria-hidden="true" style={{ position: "absolute", right: -18, top: -18, width: 90, height: 90, background: `radial-gradient(circle, ${C.accent2}33, transparent 70%)`, pointerEvents: "none" }} />

      {/* pulsing live dot */}
      <span style={{ position: "relative", width: 9, height: 9, flexShrink: 0 }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.accent2, boxShadow: `0 0 10px ${C.accent2}80`, animation: "athlosPulse 1.6s ease infinite" }} />
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: "#F4EFE6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {live.block} · {t(live.exName)}
        </span>
        <Mono style={{ color: restLeft ? "#00FF87" : "rgba(244,239,230,0.55)", fontSize: 10, letterSpacing: "0.08em" }}>
          {restLeft
            ? <>{t("ODMOR")} {restLeft}s{live.nextName ? ` · ${t("nato")}: ${t(live.nextName)}` : ""}</>
            : <>SET {Math.min(live.setDone + 1, live.setsTotal)}/{live.setsTotal}{live.load ? ` · ${live.load} ${live.unit}` : ""} · {live.reps} {t("pon.")}</>}
        </Mono>
      </span>

      <span style={{ textAlign: "right", flexShrink: 0 }}>
        <span style={{ display: "block", fontFamily: C.mono, fontWeight: 700, fontSize: 17, color: C.accent2 }}>{fmtElapsed(live.startedAt)}</span>
        <Mono style={{ color: "rgba(244,239,230,0.45)", fontSize: 9, letterSpacing: "0.1em" }}>{t("TRENING")}</Mono>
      </span>
    </button>
  );
}
