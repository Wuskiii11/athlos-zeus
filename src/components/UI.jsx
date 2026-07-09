import React, { useState } from "react";
import { useTheme } from "../theme";

/* Count-up kept as a no-op for API compatibility — minimal UI shows final value directly. */
export function useCountUp(target) {
  return target;
}

export function Pressable({ children, onClick, style, scale = 0.98, disabled }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        cursor: disabled ? "default" : "pointer",
        transition: "transform 0.12s ease, opacity 0.12s",
        transform: pressed ? `scale(${scale})` : "scale(1)",
        WebkitTapHighlightColor: "transparent",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Pulsing placeholder — used everywhere something is loading, so a slow
// network/query reads as "in progress" rather than a blank flash.
export function SkeletonBlock({ width = "100%", height = 16, radius = 8, style }) {
  const C = useTheme();
  return (
    <div className="athlos-skeleton" style={{
      width, height, borderRadius: radius,
      background: C.surface3,
      ...style,
    }} />
  );
}

// Design-system ".at-mono"/".at-eyebrow": data + kickers in JetBrains Mono,
// UPPERCASE with wide tracking — the engraved look from the reference mock.
export const Mono = ({ children, style }) => {
  const C = useTheme();
  return (
    <span style={{ fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 11, fontWeight: 600, ...style }}>
      {children}
    </span>
  );
};

// Accent word — the signature: an elegant italic serif word in neon green,
// used for ONE word inside a headline ("Dobro jutro, <Accent>Nik</Accent>")
export const Accent = ({ children, style }) => {
  const C = useTheme();
  return (
    <span style={{ fontFamily: C.serif, fontStyle: "italic", fontWeight: 500, fontSize: "1.18em", color: C.gold, letterSpacing: "0.01em", ...style }}>
      {children}
    </span>
  );
};

// ── Hellenic emblem — laurel wreath of victory + Zeus' thunderbolt ──
export const Emblem = ({ size = 40, glow = false }) => {
  const C = useTheme();
  const g = C.gold, a = C.accent;
  const leaf = (x, y, rot, s = 1) => (
    <path
      d={`M${x} ${y} q ${5 * s} ${-2.4 * s} ${7.6 * s} ${1.2 * s} q ${-3.8 * s} ${1.6 * s} ${-7.6 * s} ${-1.2 * s} z`}
      fill={g} opacity="0.92" transform={`rotate(${rot} ${x} ${y})`}
    />
  );
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      style={glow ? { filter: `drop-shadow(0 0 12px ${a}55)` } : undefined}>
      {/* left laurel branch */}
      <path d="M31 55 C19 50 13.5 39.5 16.5 26" stroke={g} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.95" />
      {leaf(19.5, 45, 120)}{leaf(16.6, 38, 150)}{leaf(15.8, 31, 175)}{leaf(17.4, 25, 205)}
      {/* right laurel branch (mirror) */}
      <path d="M33 55 C45 50 50.5 39.5 47.5 26" stroke={g} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.95" />
      {leaf(44.5, 45, 60)}{leaf(47.4, 38, 30)}{leaf(48.2, 31, 5)}{leaf(46.6, 25, -25)}
      {/* Zeus' thunderbolt */}
      <path d="M35.5 11 L25 33 H31.5 L29 51 L40.5 28 H34 L36.5 11 Z"
        fill={a} stroke={a} strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  );
};

// ── Wordmark — inscriptional Cinzel caps, gold "OS" (the one place the
// engraved brand face survives the app-wide Poppins switch) ──
export const Wordmark = ({ size = 30, style }) => {
  const C = useTheme();
  return (
    <span style={{ fontFamily: "'Cinzel',Georgia,serif", fontWeight: 700, fontSize: size, letterSpacing: "0.18em", color: C.text, ...style }}>
      ATHL<span style={{ color: C.gold }}>OS</span>
    </span>
  );
};

export const Kicker = ({ children, color }) => {
  const C = useTheme();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      fontFamily: C.display, fontSize: 13.5, letterSpacing: "0.02em", textTransform: "lowercase",
      color: color || C.muted, fontWeight: 500, marginBottom: 6,
    }}>
      <span aria-hidden="true" style={{
        width: 5, height: 5, borderRadius: "50%", background: C.accent, flexShrink: 0,
      }} />
      {children}
    </div>
  );
};

export const Pill = ({ children, fill, color }) => {
  const C = useTheme();
  const c = color || C.accent;
  return (
    <span style={{
      fontFamily: C.display, fontSize: 12.5, letterSpacing: "0.01em", textTransform: "lowercase",
      padding: "4px 11px", borderRadius: 999, fontWeight: 600,
      color: fill ? "#000" : c, background: fill ? c : `${c}16`,
      border: "none",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
};

export function LanguageSwitcher({ value = "sl", onChange, style, variant = "default" }) {
  const C = useTheme();
  const cur = value === "en" ? "en" : "sl";
  const floating = variant === "floating";
  const compact = variant === "compact"; // small pill for tight headers (e.g. onboarding)
  const options = [
    ["sl", "SL", "Slovenščina", "Slovenian"],
    ["en", "EN", "English", "English"],
  ];

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: floating || compact ? 3 : 4,
        padding: floating || compact ? 3 : 4,
        borderRadius: 999,
        background: floating
          ? (C.name === "dark" ? "rgba(8,11,10,0.72)" : "rgba(255,255,255,0.72)")
          : C.surface2,
        border: `1px solid ${floating ? (C.name === "dark" ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)") : C.border2}`,
        boxShadow: floating ? (C.name === "dark" ? "0 6px 16px rgba(0,0,0,0.35)" : "0 6px 16px rgba(28,24,20,0.12)") : "none",
        backdropFilter: floating ? "blur(18px)" : undefined,
        WebkitBackdropFilter: floating ? "blur(18px)" : undefined,
        minHeight: floating ? 38 : compact ? 30 : 44,
        ...style,
      }}
    >
      {options.map(([code, short, label, title]) => {
        const active = cur === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            aria-label={title}
            title={title}
            onClick={() => onChange?.(code)}
            style={{
              minWidth: floating ? 42 : compact ? 34 : 54,
              minHeight: floating ? 32 : compact ? 24 : 36,
              padding: floating ? "0 10px" : compact ? "0 8px" : "0 12px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: active ? (floating ? C.accent : C.btn) : "transparent",
              color: active ? (floating ? "#04130a" : C.btnText) : C.muted,
              fontFamily: C.display,
              fontWeight: active ? 800 : 700,
              fontSize: floating ? 11 : compact ? 10.5 : 12,
              letterSpacing: "0.04em",
              boxShadow: active && floating ? `0 0 0 1px ${C.accent}30` : "none",
              transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}

export const PrimaryBtn = ({ children, onClick, style, disabled }) => {
  const C = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: "100%", height: 56, padding: "0 16px", borderRadius: 18, border: "none",
        background: C.btn, color: C.btnText,
        fontFamily: C.display, fontWeight: 700, textTransform: "none",
        letterSpacing: "0.01em", fontSize: 16.5,
        cursor: disabled ? "default" : "pointer",
        // the ONE element allowed a soft glow — the brand-green CTA
        boxShadow: pressed ? "none" : C.glowSoft,
        WebkitTapHighlightColor: "transparent",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const BackBtn = ({ onClick }) => {
  const C = useTheme();
  return (
    <Pressable onClick={onClick} scale={0.88} style={{
      background: "transparent", border: `1px solid ${C.border}`, borderRadius: 50,
      width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
      color: C.text, marginRight: 12, lineHeight: 1, flexShrink: 0,
    }}>
      <svg width="9" height="16" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1L1 9l8 8"/>
      </svg>
    </Pressable>
  );
};

export const Icon = ({ name, color, size = 22 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "today":    return (<svg {...common}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>);
    case "train":    return (<svg {...common}><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/></svg>);
    case "fuel":     return (<svg {...common}><path d="M6 3v7a2 2 0 004 0V3M8 11v10M18 3c-1.5 0-3 1.5-3 5s1.5 4 3 4v9"/></svg>);
    // AI wears its own colours: a four-point sparkle with a pink→violet→aqua
    // gradient (ignores the passed colour on purpose — AI is never muted)
    case "ai":       return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="at-ai-sparkle" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF7AD9" />
            <stop offset="50%" stopColor="#9D7BFF" />
            <stop offset="100%" stopColor="#3ECFEF" />
          </linearGradient>
        </defs>
        <path d="M13.5 5c.9 4.2 2.3 5.6 6.5 6.5-4.2.9-5.6 2.3-6.5 6.5-.9-4.2-2.3-5.6-6.5-6.5 4.2-.9 5.6-2.3 6.5-6.5z" fill="url(#at-ai-sparkle)" />
        <path d="M6.5 3c.45 2.1 1.15 2.8 3.25 3.25C7.65 6.7 6.95 7.4 6.5 9.5 6.05 7.4 5.35 6.7 3.25 6.25 5.35 5.8 6.05 5.1 6.5 3z" fill="url(#at-ai-sparkle)" opacity="0.85" />
        <circle cx="5.6" cy="19" r="1.1" fill="url(#at-ai-sparkle)" opacity="0.7" />
      </svg>
    );
    case "season":   return (<svg {...common}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>);
    case "settings": return (<svg {...common}><circle cx="12" cy="8" r="3.2"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg>);
    case "calendar": return (<svg {...common}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>);
    case "chat":     return (<svg {...common}><path d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.5 8.5 0 01-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 01-.9-3.8A8.38 8.38 0 0112.5 3 8.38 8.38 0 0121 11.5z"/></svg>);
    case "club":     return (<svg {...common}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9.5 12l1.8 1.8 3.2-3.6"/></svg>);
    case "profile":  return (<svg {...common}><circle cx="12" cy="8" r="3.6"/><path d="M5 20v-1a7 7 0 0114 0v1"/></svg>);
    default: return null;
  }
};

// Icon-only tab: the active one is a solid accent circle with a knocked-out
// icon, inactive ones are bare muted glyphs — the compact floating-pill look.
// `dot` marks the tab with a small badge (e.g. unread chat messages).
export function TabButton({ n, active, onClick, dot }) {
  const C = useTheme();
  const dark = C.name === "dark";
  return (
    <button
      onClick={onClick}
      aria-label={n.label}
      className="athlos-tab-btn"
      style={{
        flex: "0 0 auto", width: active ? "auto" : 46, height: 46, borderRadius: 999,
        padding: active ? "0 18px" : 0,
        border: "none", cursor: "pointer", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? C.accent : "transparent",
        boxShadow: "none",
        WebkitTapHighlightColor: "transparent",
        transition: "background 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      {/* active tab spells its name; the icon only stands in while inactive */}
      {active
        ? <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 13.5, color: dark ? "#04130A" : "#FFFFFF", whiteSpace: "nowrap", lineHeight: 1 }}>{n.label}</span>
        : <Icon name={n.icon} color={C.muted} size={22} />}
      {dot && <span aria-hidden="true" style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: C.red, border: active ? `1.5px solid ${C.accent}` : "none" }} />}
      <style>{`
        .athlos-tab-btn { transition: transform 0.15s ease; }
        .athlos-tab-btn:active { transform: scale(0.86); }
      `}</style>
    </button>
  );
}

export function SettingsBlock({ title, children }) {
  const C = useTheme();
  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
      <Mono style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 12 }}>{title}</Mono>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Design-system primitives — the premium dark language used across
// every screen. Soft dark card, no border, 24px radius, one green
// accent, quiet shadow. Keep new screens built from THESE, so the
// whole app stays visually consistent.
// ─────────────────────────────────────────────────────────────

// Soft dark surface card. Pass onClick to make it a pressable row.
// Glass-like: an extremely soft top sheen + hairline over the flat fill gives
// premium depth without any obvious gradient.
export function Card({ children, onClick, style, pad = 20, radius = 24 }) {
  const C = useTheme();
  const dark = C.name === "dark";
  const base = {
    background: dark
      ? `linear-gradient(180deg, rgba(255,255,255,0.022), rgba(255,255,255,0) 44%), ${C.surface2}`
      : `linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 42%), ${C.surface2}`,
    borderRadius: radius, padding: pad,
    border: `1px solid ${dark ? "rgba(255,255,255,0.045)" : "rgba(16,24,40,0.05)"}`,
    boxShadow: dark
      ? "0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)"
      : "0 2px 12px rgba(16,24,40,0.05)",
    ...style,
  };
  return onClick
    ? <Pressable onClick={onClick} scale={0.99} style={{ ...base, width: "100%", textAlign: "left", display: "block" }}>{children}</Pressable>
    : <div style={base}>{children}</div>;
}

// Small uppercase section header with an optional right-aligned action.
export function SectionLabel({ children, action, onAction, style }) {
  const C = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, ...style }}>
      <span style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>{children}</span>
      {action && (
        <button onClick={onAction} style={{ background: "none", border: "none", color: C.accent, fontFamily: C.display, fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, WebkitTapHighlightColor: "transparent" }}>{action}</button>
      )}
    </div>
  );
}

// Compact metric tile — label · value · optional sub · optional level bar.
// The single building block for stat grids and metric rows everywhere.
export function StatTile({ label, value, sub, onClick, barPct, color, valueColor, style }) {
  const C = useTheme();
  const inner = (
    <>
      <span style={{ display: "block", fontFamily: C.mono, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted2, marginBottom: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span style={{ display: "block", fontFamily: C.display, fontWeight: 800, fontSize: 19, color: valueColor || C.text, lineHeight: 1, letterSpacing: "-0.01em" }}>{value}</span>
      {sub && <span style={{ display: "block", fontFamily: C.display, fontWeight: 500, fontSize: 11.5, color: C.muted, marginTop: 5 }}>{sub}</span>}
      {typeof barPct === "number" && (
        <span style={{ display: "block", height: 4, borderRadius: 999, background: C.surface3, overflow: "hidden", marginTop: 11 }}>
          <span style={{ display: "block", width: `${Math.round(Math.max(0, Math.min(1, barPct)) * 100)}%`, height: "100%", borderRadius: 999, background: color || C.accent, transition: "width 0.7s cubic-bezier(.22,1,.36,1)" }} />
        </span>
      )}
    </>
  );
  const dark = C.name === "dark";
  const base = {
    background: dark
      ? `linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0) 46%), ${C.surface2}`
      : `linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 44%), ${C.surface2}`,
    borderRadius: 20, padding: "14px 14px", textAlign: "left",
    border: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "rgba(16,24,40,0.045)"}`,
    boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.025)" : "0 1px 6px rgba(16,24,40,0.04)",
    ...style,
  };
  return onClick
    ? <Pressable onClick={onClick} scale={0.98} style={{ ...base, width: "100%", display: "block" }}>{inner}</Pressable>
    : <div style={base}>{inner}</div>;
}
