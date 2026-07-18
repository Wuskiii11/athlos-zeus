import React, { useState } from "react";
import { useTheme } from "../theme";
import ScreenChat from "./ScreenChat";

// ══════════════════════════════════════════════════════════════
// ATHLOS — Community
// Two sections: Private (real groups + chats — the existing ScreenChat
// engine, Supabase-backed) and Public (discover communities). Premium,
// minimal, WHOOP-inspired but fully ATHLOS.
// ══════════════════════════════════════════════════════════════

// ── Mock data (→ Supabase later) ─────────────────────────────
// communities → public.communities (public, discoverable)
const FEATURED = {
  id: "sl", flag: "🇸🇮", name: "Slovenia",
  description: "Official Athlos community for athletes from Slovenia. Share workouts, compete on leaderboards and connect with local members.",
  members: 2438, activeToday: 412,
};

const TRENDING = [
  { id: "hr", icon: "🇭🇷", name: "Croatia",          members: 1800 },
  { id: "run", icon: "🏃", name: "Running",           members: 9200 },
  { id: "cyc", icon: "🚴", name: "Cycling",           members: 6100 },
  { id: "str", icon: "🏋️", name: "Strength Training", members: 8400 },
];

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`);
const haptic = () => { try { navigator.vibrate?.(8); } catch {} };

// ── SegmentedControl — sliding indicator, smooth ─────────────
function SegmentedControl({ tabs, value, onChange, C }) {
  const i = Math.max(0, tabs.findIndex((t) => t.key === value));
  return (
    <div style={{
      position: "relative", display: "flex", padding: 4, borderRadius: 999,
      background: C.surface2, border: `1px solid ${C.border}`,
    }}>
      <div aria-hidden="true" style={{
        position: "absolute", top: 4, bottom: 4, left: 4, width: `calc((100% - 8px) / ${tabs.length})`,
        borderRadius: 999, background: C.accent,
        transform: `translateX(${i * 100}%)`,
        transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
        boxShadow: `0 4px 14px ${C.accent}33`,
      }} />
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button key={t.key} onClick={() => { haptic(); onChange(t.key); }} style={{
            position: "relative", zIndex: 1, flex: 1, border: "none", background: "none",
            padding: "10px 0", borderRadius: 999, cursor: "pointer", WebkitTapHighlightColor: "transparent",
            fontFamily: C.display, fontWeight: 700, fontSize: 14.5,
            color: on ? C.btnText : C.muted, transition: "color 0.25s",
          }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── SearchBar — expands (brightens + lifts) on focus ─────────
function SearchBar({ value, onChange, placeholder, C }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 50,
      borderRadius: 16, background: C.surface2,
      border: `1px solid ${focus ? C.accent : C.border}`,
      boxShadow: focus ? `0 0 0 3px ${C.accent}1f` : "none",
      transform: focus ? "scale(1.01)" : "scale(1)",
      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s cubic-bezier(0.22,1,0.36,1)",
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={focus ? C.accent : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke 0.2s" }}>
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: C.text, fontFamily: C.display, fontWeight: 500, fontSize: 15 }}
      />
    </div>
  );
}

// ── CommunityCard — variant "featured" (hero) or "trending" ──
function CommunityCard({ community, variant, C, onJoin }) {
  const [joined, setJoined] = useState(false);
  const JoinBtn = (
    <button
      className="ath-press"
      onClick={(e) => { e.stopPropagation(); haptic(); setJoined((v) => !v); onJoin?.(community); }}
      style={{
        border: "none", borderRadius: 999, padding: "9px 18px", cursor: "pointer", flexShrink: 0,
        fontFamily: C.display, fontWeight: 800, fontSize: 13, WebkitTapHighlightColor: "transparent",
        background: joined ? "transparent" : C.accent,
        color: joined ? C.muted : C.btnText,
        boxShadow: joined ? "none" : `0 6px 18px ${C.accent}33`,
        outline: joined ? `1px solid ${C.border2}` : "none",
        transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
      }}>
      {joined ? "Joined" : "Join"}
    </button>
  );

  if (variant === "featured") {
    return (
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 24, padding: 20,
        background: `radial-gradient(120% 90% at 85% -10%, ${C.accent}1f, transparent 55%), ${C.surface}`,
        border: `1px solid ${C.accent}22`,
        boxShadow: `0 10px 34px rgba(0,0,0,0.4), 0 0 0 1px ${C.accent}0a`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 58, height: 58, borderRadius: "50%", flexShrink: 0, fontSize: 30, background: C.surface3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{community.flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.18em", color: C.accent, marginBottom: 4 }}>FEATURED</div>
            <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 22, color: C.text, letterSpacing: "-0.01em" }}>{community.name}</div>
          </div>
          {JoinBtn}
        </div>
        <p style={{ fontFamily: C.display, fontSize: 13.5, lineHeight: 1.55, color: C.text2, margin: "14px 0 16px" }}>{community.description}</p>
        <div style={{ display: "flex", gap: 10 }}>
          {[["Members", fmt(community.members)], ["Active today", fmt(community.activeToday)]].map(([k, v]) => (
            <div key={k} style={{ flex: 1, borderRadius: 16, padding: "12px 14px", background: C.surface2, border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: "0.12em", color: C.muted2 }}>{k.toUpperCase()}</div>
              <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 20, color: C.text, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ath-press" style={{
      display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20,
    }}>
      <span style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, fontSize: 20, background: C.surface3, display: "flex", alignItems: "center", justifyContent: "center" }}>{community.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text }}>{community.name}</div>
        <div style={{ fontFamily: C.display, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{fmt(community.members)} members</div>
      </div>
      {JoinBtn}
    </div>
  );
}

const SectionHeader = ({ children, C }) => (
  <h3 style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color: C.text, margin: "0 0 12px", letterSpacing: "-0.01em" }}>{children}</h3>
);

// ── Private — the real chat engine (groups + direct messages, Supabase-
// backed). ScreenChat already renders its own "Your groups / all chats"
// filter chips, search, new-chat + new-group flows and full conversation
// detail view (fixed full-screen overlay), so it's mounted directly rather
// than re-built as a mock — same premium UI, real data underneath.
function PrivateTab({ user, profile, onConvOpenChange }) {
  return (
    <div style={{ margin: "0 -18px", animation: "athlosCommFade 0.3s ease" }}>
      <ScreenChat user={user} profile={profile} onConvOpenChange={onConvOpenChange} />
    </div>
  );
}

// ── Public ────────────────────────────────────────────────────
function PublicTab({ C }) {
  const [q, setQ] = useState("");
  const trending = TRENDING.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div style={{ animation: "athlosCommFade 0.3s ease" }}>
      <div style={{ marginBottom: 22 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search communities…" C={C} />
      </div>

      {!q && (
        <div style={{ marginBottom: 26 }}>
          <CommunityCard community={FEATURED} variant="featured" C={C} />
        </div>
      )}

      <SectionHeader C={C}>Trending Communities</SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {trending.map((c) => <CommunityCard key={c.id} community={c} variant="trending" C={C} />)}
        {trending.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, fontFamily: C.display, fontStyle: "italic", fontSize: 14.5, padding: "22px 0" }}>
            No communities match “{q}”.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────
// `onConvOpenChange` is forwarded to ScreenChat and up to App.jsx, which
// already had the wiring in place (chatConvOpen) to hide the bottom nav
// while a full-screen conversation/new-chat/new-group subview is open.
export default function ScreenCommunity({ user, profile, onConvOpenChange }) {
  const C = useTheme();
  const [tab, setTab] = useState("private");

  return (
    <div style={{ padding: "10px 18px 40px", color: C.text, position: "relative", minHeight: "100%" }}>
      <style>{`
        .ath-press { transition: transform 0.14s cubic-bezier(0.22,1,0.36,1); }
        .ath-press:active { transform: scale(0.975); }
        @keyframes athlosCommFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Header */}
      <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 27, margin: "6px 0 4px", letterSpacing: "-0.02em" }}>Community</h2>
      <p style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, margin: "0 0 18px" }}>Train together. Compete together.</p>

      {/* Segmented control */}
      <div style={{ marginBottom: 22 }}>
        <SegmentedControl
          tabs={[{ key: "private", label: "Private" }, { key: "public", label: "Public" }]}
          value={tab} onChange={setTab} C={C}
        />
      </div>

      {tab === "private"
        ? <PrivateTab user={user} profile={profile} onConvOpenChange={onConvOpenChange} />
        : <PublicTab C={C} />}
    </div>
  );
}
