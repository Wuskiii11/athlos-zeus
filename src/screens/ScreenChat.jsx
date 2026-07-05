import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../theme";
import { BackBtn, Pressable, Mono, SkeletonBlock } from "../components/UI";
import { IcTrash } from "../components/Icons";
import { useT } from "../lib/i18n";
import {
  listConversations, listMessages, sendMessage, listClubmates,
  getOrCreateDirectConversation, createGroupConversation,
  blockUser, listBlocks, updateConversationBackground,
  uploadChatFile, hasSupabase, loadChatReads, markChatRead, searchUsers,
} from "../lib/api";

// ─── Constants ───────────────────────────────────────────────
const STICKERS = [
  "💪","🔥","⚡","🏆","⚽","🏃","🥇","👊","🎯","💯",
  "😤","🦾","🏋️","🤸","🧘","🚴","🤼","🏊","🥊","🎽",
  "😎","🙌","👏","✨","⭐","🎉","😅","🤙","🫡","❤️",
];

const BG_OPTIONS = [
  { id: "default",  label: "Privzeto",   color: null },
  { id: "marble",   label: "Marmor",     color: "#F4EFE6" },
  { id: "dark",     label: "Temno",      color: "#1a1714" },
  { id: "white",    label: "Belo",       color: "#FFFFFF" },
  { id: "sand",     label: "Pesek",      color: "#E8DCC8" },
  { id: "olive",    label: "Olivno",     color: "#1e2d1a" },
  { id: "navy",     label: "Mornarsko",  color: "#0f1a2e" },
  { id: "bronze",   label: "Bronzasto",  color: "#2d1e0a" },
];

const DEMO_AUTO_REPLIES = [
  "Super trening!", "Se vidimo jutri!", "OK!", "Hvala za info!", "Res!",
  "Jasno!", "Bom tam ob 17:00!", "Odlično!", "Pogledal bom!",
];

// Prototype conversations seeded locally so the chat list always has content
const PROTO_PEOPLE = [
  { user_id: "proto-nina",   name: "Nina Mlakar",      initials: "NM", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-tim",    name: "Tim Žagar",        initials: "TŽ", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-eva",    name: "Eva Horvat",       initials: "EH", club: "NK Domžale", sport: "Atletika" },
  { user_id: "proto-matej",  name: "Coach Matej",      initials: "M",  club: "NK Domžale", sport: "Trener" },
  { user_id: "proto-luka",   name: "Luka Kovač",       initials: "LK", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-ana",    name: "Ana Kos",          initials: "AK", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-jure",   name: "Jure Novak",       initials: "JN", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-marko",  name: "Marko Potočnik",   initials: "MP", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-sara",   name: "Sara Vidmar",      initials: "SV", club: "AK Kladivar", sport: "Atletika" },
  { user_id: "proto-ziga",   name: "Žiga Kranjc",      initials: "ŽK", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-maja",   name: "Maja Petek",       initials: "MP", club: "Fizioterapija", sport: "Fizioterapevtka" },
  { user_id: "proto-rok",    name: "Rok Zupan",        initials: "RZ", club: "NK Bravo", sport: "Nogomet" },
];
const PROTO_SEEDS = [
  { otherId: "proto-matej", msgs: [
    { from: "proto-matej", text: "Jutri pridemo 15 min prej — video analiza tekme.", ago: 12 },
    { from: "me",          text: "Razumem, bom tam.", ago: 8 },
  ]},
  { otherId: "proto-nina",  msgs: [
    { from: "proto-nina", text: "Živjo! Jutri trening ob 17:00.", ago: 82 },
    { from: "me",         text: "Super, sem tam!", ago: 80 },
    { from: "proto-nina", text: "Odlično, se vidiva!", ago: 79 },
  ]},
  { otherId: "proto-tim",   msgs: [
    { from: "proto-tim",  text: "Kaj kažeš za skupinski trening v soboto?", ago: 200 },
    { from: "me",         text: "Zveni dobro, ob kateri uri?", ago: 198 },
    { from: "proto-tim",  text: "10:00, zbirališče pri dvorani", ago: 197 },
  ]},
  { otherId: "proto-eva",   msgs: [
    { from: "proto-eva",  text: "Pogledala sem tvoje čase — odlično napredovanje!", ago: 300 },
    { from: "me",         text: "Hvala! Trdo delam.", ago: 298 },
  ]},
  { otherId: "proto-luka",  msgs: [
    { from: "proto-luka", text: "A mi posodiš elastike za jutri?", ago: 460 },
    { from: "me",         text: "Ja, prinesem jih na trening.", ago: 455 },
  ]},
  { otherId: "proto-maja",  msgs: [
    { from: "proto-maja", text: "Kako je s kolenom po zadnji terapiji?", ago: 690 },
    { from: "me",         text: "Precej bolje, hvala. Jutri spet lahko tečem.", ago: 640 },
    { from: "proto-maja", text: "Odlično. V četrtek nadaljujeva z re-load fazo.", ago: 620 },
  ]},
  { otherId: "proto-ana",   msgs: [
    { from: "proto-ana",  text: "Vidiš tabelo? Tri točke zaostanka!", ago: 1500 },
    { from: "me",         text: "Ja! V soboto jih ujamemo.", ago: 1480 },
  ]},
  { otherId: "proto-jure",  msgs: [
    { from: "proto-jure", text: "Kdo pobere dres pri opremi?", ago: 2900 },
  ]},
  { otherId: "proto-sara",  msgs: [
    { from: "proto-sara", text: "Prideš pogledat miting v nedeljo?", ago: 4300 },
    { from: "me",         text: "Če ne bo tekme, pridem!", ago: 4200 },
  ]},
  { otherId: "proto-marko", msgs: [
    { from: "proto-marko", text: "Gleženj je spet v redu, naslednji teden sem nazaj.", ago: 5800 },
    { from: "me",          text: "Super novica! Pazi nase.", ago: 5700 },
  ]},
  { otherId: "proto-ziga",  msgs: [
    { from: "proto-ziga", text: "Deliš svoj program za moč? Zanima me tvoj počep.", ago: 7300 },
  ]},
  { otherId: "proto-rok",   msgs: [
    { from: "proto-rok",  text: "Dobra tekma prejšnji teden. Se vidimo v povratni!", ago: 8600 },
    { from: "me",         text: "Hvala, enako. Brez milosti :)", ago: 8500 },
  ]},
];

function seedProtoConvs(userId) {
  if (!userId) return;
  const LS = "athlos:v1";
  let state;
  try { state = JSON.parse(localStorage.getItem(LS)) || {}; } catch { state = {}; }
  const chat = state.chat || {};
  const convs = { ...(chat.convs || {}) };
  const msgs  = { ...(chat.msgs  || {}) };
  const now = Date.now();
  for (const seed of PROTO_SEEDS) {
    const key = [userId, seed.otherId].sort().join("~");
    if (!convs[key]) {
      convs[key] = { id: key, type: "direct", created_by: userId, background: "default", created_at: new Date(now - 400 * 60000).toISOString(), otherUser: PROTO_PEOPLE.find(p => p.user_id === seed.otherId) };
      msgs[key] = seed.msgs.map((m, i) => ({
        id: `proto-${key}-${i}`,
        conversation_id: key,
        sender_id: m.from === "me" ? userId : m.from,
        type: "text",
        content: m.text,
        created_at: new Date(now - m.ago * 60000).toISOString(),
      }));
    }
  }
  state.chat = { ...chat, convs, msgs };
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch {}
}

// ─── Avatar ──────────────────────────────────────────────────
// Latin → Greek monogram, transliterated by sound. Lowercase glyphs on
// purpose: half the Greek capitals share the Latin shape (Α, Ε, Μ, Τ…),
// so only the lowercase alphabet reads unmistakably Greek.
const GREEK = {
  A: "α", B: "β", C: "κ", Č: "κ", Ć: "κ", D: "δ", E: "ε", F: "φ", G: "γ",
  H: "η", I: "ι", J: "ι", K: "κ", L: "λ", M: "μ", N: "ν", O: "ο", P: "π",
  Q: "κ", R: "ρ", S: "σ", Š: "σ", T: "τ", U: "υ", V: "υ", W: "ω", X: "χ",
  Y: "υ", Z: "ζ", Ž: "ζ",
};
export const toGreek = (s) => String(s).split("").map((ch) => GREEK[ch.toUpperCase()] || ch).join("");

// Marble disc with a ring — engraved Greek monogram, like a small medallion.
function Avatar({ initials = "?", size = 44, isGroup }) {
  const C = useTheme();
  const dark = C.name === "dark";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      // filled "greige" disc (like Apple's grey avatars, warmed to the marble
      // palette) so the icon reads as a solid chip against the cream page —
      // not just a ring blending into the background
      background: dark
        ? "radial-gradient(circle at 38% 30%, #3B3833, #26241F 78%, #1D1B17 100%)"
        : "radial-gradient(circle at 38% 30%, #ECE7DD, #D7CFC0 66%, #C4BAA5 100%)",
      border: `1.5px solid ${C.gold}55`,
      boxShadow: dark ? "inset 0 1px 1px rgba(255,255,255,0.06)" : "inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 7px rgba(28,24,20,0.10)",
      display: "flex", alignItems: "center", justifyContent: "center",
      // Georgia fallback carries the Greek glyphs (Cinzel is Latin-only);
      // regular weight so the glyph reads as a thin engraved stroke
      fontFamily: C.heading, fontWeight: 400, fontSize: size * 0.48, lineHeight: 1,
      color: isGroup ? C.gold : (dark ? C.text : "#1C1814"),
    }}>
      {isGroup ? (
        <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ) : toGreek(initials)}
    </div>
  );
}

// ─── Greek-key divider (shared ornament) ─────────────────────
function Meander({ color, width = 96, opacity = 0.5 }) {
  const mask = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='14'%3E%3Cpath d='M0 12h6V3h6v9h6V3h6v9h2' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E\") repeat-x center / 32px 14px";
  return <div aria-hidden="true" style={{ height: 14, width, background: color, opacity, WebkitMask: mask, mask }} />;
}

// ─── Day divider — engraved rule with a mono date ────────────
function DayDivider({ label, C, muted, line }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 6px 10px" }}>
      <span style={{ flex: 1, height: 1, background: line }} />
      <Mono style={{ color: muted, fontSize: 9, letterSpacing: "0.28em" }}>{label}</Mono>
      <span style={{ flex: 1, height: 1, background: line }} />
    </div>
  );
}

// ─── Message bubble ──────────────────────────────────────────
// The correspondence reads like a classical dialogue: the other side speaks
// in italic Cormorant on a marble tablet; my replies are engraved ink panels
// with a faint green "oracle" breath in the corner. Timestamps only close a
// run of messages, like a catalog mark.
function Bubble({ msg, isMine, C, onLongPress, showTime = true, darkBg = false }) {
  const isSticker = msg.type === "sticker";
  if (isSticker) {
    return (
      <div style={{ textAlign: isMine ? "right" : "left", margin: "4px 0" }}>
        <span
          onContextMenu={e => { e.preventDefault(); onLongPress?.(msg); }}
          style={{ fontSize: 62.5, lineHeight: 1.1, display: "inline-block", cursor: "context-menu" }}
        >{msg.content}</span>
      </div>
    );
  }

  const isImage = msg.type === "image";
  const isVideo = msg.type === "video";
  const isFile  = msg.type === "file";
  // Mine = dark "ink" panel with warm marble text (the premium statement of the
  // design system); theirs = raised marble surface with a vein border on light
  // backdrops, a translucent light panel on dark ones. Text color is tied to
  // the BUBBLE surface, never to the conversation backdrop — that's what kept
  // making white-on-marble unreadable on dark chat backgrounds.
  const bgBubble = isMine
    ? "linear-gradient(160deg, #26221C, #1C1814)"
    : (darkBg ? "rgba(255,255,255,0.09)" : "linear-gradient(170deg, #FCF9F2, #F0E9DA)");
  const bubbleBorder = isMine
    ? `1px solid ${darkBg ? "rgba(244,239,230,0.22)" : "rgba(244,239,230,0.10)"}`
    : `1px solid ${darkBg ? "rgba(255,255,255,0.16)" : "#D8CFBD"}`;
  const textColor = isMine ? "#F4EFE6" : (darkBg ? "rgba(255,255,255,0.92)" : "#1C1814");

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isMine ? "flex-end" : "flex-start",
      margin: "2px 0",
      animation: isMine ? "athlosMsgUser 0.2s ease" : "athlosMsgBot 0.2s ease",
    }}>
      <div
        onContextMenu={e => { e.preventDefault(); onLongPress?.(msg); }}
        style={{
          maxWidth: "74%",
          padding: (isImage || isVideo) ? 0 : "10px 15px",
          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: bgBubble,
          border: bubbleBorder,
          color: textColor,
          overflow: "hidden",
          cursor: "context-menu",
          position: "relative",
          boxShadow: isMine ? "0 6px 16px rgba(28,24,20,0.18)" : (darkBg ? "none" : "0 3px 10px rgba(28,24,20,0.05)"),
        }}
      >
        {/* faint oracle breath in the corner of my ink panels */}
        {isMine && msg.type === "text" && (
          <span aria-hidden="true" style={{ position: "absolute", right: -14, top: -14, width: 56, height: 56, background: `radial-gradient(circle, ${C.accent2}29, transparent 70%)`, pointerEvents: "none" }} />
        )}
        {isImage && msg.attachment_url && (
          <img
            src={msg.attachment_url} alt=""
            style={{ width: "100%", maxWidth: 220, maxHeight: 260, objectFit: "cover", display: "block",
              borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}
          />
        )}
        {isVideo && msg.attachment_url && (
          <video
            src={msg.attachment_url} controls playsInline
            style={{ width: "100%", maxWidth: 220, display: "block",
              borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}
          />
        )}
        {isFile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontFamily: C.display, fontSize: 14.5, fontWeight: 600 }}>
              {msg.content || "Datoteka"}
            </span>
          </div>
        )}
        {msg.type === "text" && (
          <span style={{
            fontFamily: C.display, fontSize: 17.5, fontWeight: 500, lineHeight: 1.45,
            fontStyle: isMine ? "normal" : "italic", position: "relative",
          }}>
            {msg.content}
          </span>
        )}
      </div>
      {showTime && (
        <Mono style={{ fontSize: 9, color: C.muted2, margin: "3px 4px", letterSpacing: "0.12em" }}>
          {msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })
            : ""}
        </Mono>
      )}
    </div>
  );
}

// ─── Profile Sheet ────────────────────────────────────────────
function ProfileSheet({ user, C, t, onClose, onMessage, onBlock }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.52)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: C.bg, borderRadius: "24px 24px 0 0", padding: "24px 22px 40px",
        animation: "athlosRise 0.32s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: "0 auto 22px" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <div style={{
            width: 76, height: 76, borderRadius: "50%",
            background: `${C.accent}18`, border: `2px solid ${C.accent}45`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: C.heading, fontSize: 29, fontWeight: 700, color: C.accent,
          }}>{toGreek(user?.initials || "?")}</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: C.heading, fontSize: 21.5, fontWeight: 700, color: C.text, letterSpacing: "0.04em" }}>
              {user?.name}
            </div>
            {user?.sport && (
              <Mono style={{ color: C.accent, fontSize: 11, display: "block", marginTop: 3 }}>
                {user.sport}
              </Mono>
            )}
            {user?.club && (
              <Mono style={{ color: C.muted, fontSize: 11, display: "block", marginTop: 2 }}>
                {user.club}
              </Mono>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onMessage} style={{
            padding: "15px", borderRadius: 14, border: "none",
            background: C.accent, color: C.name === "dark" ? "#04130a" : "#fff",
            fontFamily: C.display, fontSize: 17, fontWeight: 700, cursor: "pointer",
          }}>
            {t("Pošlji sporočilo")}
          </button>
          <button onClick={() => onBlock(user?.user_id)} style={{
            padding: "15px", borderRadius: 14, border: "1px solid rgba(229,83,75,0.35)",
            background: "transparent", color: "#e5534b",
            fontFamily: C.display, fontSize: 17, fontWeight: 600, cursor: "pointer",
          }}>
            {t("Blokiraj")}
          </button>
          <button onClick={onClose} style={{
            padding: "13px", borderRadius: 14, border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted,
            fontFamily: C.display, fontSize: 15.5, fontWeight: 600, cursor: "pointer",
          }}>
            {t("Zapri")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Background Sheet ─────────────────────────────────────────
function BgSheet({ current, C, t, onSelect, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.52)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: C.bg, borderRadius: "24px 24px 0 0", padding: "24px 20px 44px",
        animation: "athlosRise 0.32s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: "0 auto 18px" }} />
        <div style={{ fontFamily: C.heading, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>
          {t("Ozadje pogovora")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {BG_OPTIONS.map(bg => (
            <button key={bg.id} onClick={() => { onSelect(bg.id); onClose(); }} style={{
              aspectRatio: "1", borderRadius: 14,
              background: bg.color || C.bg,
              border: current === bg.id
                ? `2.5px solid ${C.accent}`
                : `1.5px solid ${C.border}`,
              cursor: "pointer", position: "relative",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              padding: "0 0 6px",
            }}>
              <span style={{
                fontFamily: C.display, fontSize: 10, fontWeight: 700,
                color: bg.id === "dark" || bg.id === "olive" || bg.id === "navy" || bg.id === "bronze"
                  ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)",
                letterSpacing: "0.02em",
              }}>
                {bg.label}
              </span>
              {current === bg.id && (
                <div style={{
                  position: "absolute", top: 6, right: 6, width: 14, height: 14,
                  borderRadius: "50%", background: C.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width={8} height={6} viewBox="0 0 8 6" fill="none">
                    <path d="M1 3l2 2 4-4" stroke={C.name === "dark" ? "#04130a" : "#fff"} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Block Confirm ────────────────────────────────────────────
function BlockConfirm({ name, C, t, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: C.bg, borderRadius: 20, padding: "26px 22px 20px", width: "88%", maxWidth: 320,
        animation: "athlosFade 0.2s ease",
      }}>
        <div style={{ fontFamily: C.heading, fontSize: 19, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 8 }}>
          {t("Blokiraj")} {name}
        </div>
        <div style={{ fontFamily: C.display, fontSize: 14.5, color: C.muted, textAlign: "center", marginBottom: 22, lineHeight: 1.4 }}>
          {t("Uporabnik vam ne bo mogel pošiljati sporočil.")}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${C.border}`,
            background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 600, cursor: "pointer",
          }}>{t("Prekliči")}</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: 14, borderRadius: 12, border: "none",
            background: "#e5534b", color: "#fff",
            fontFamily: C.display, fontWeight: 700, cursor: "pointer",
          }}>{t("Blokiraj")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Message Menu ──────────────────────────────────────
function MsgMenu({ msg, C, t, onDelete, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: C.bg, borderRadius: "20px 20px 0 0", padding: "18px 18px 36px",
        animation: "athlosRise 0.28s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: C.border2, margin: "0 auto 16px" }} />
        <button onClick={onDelete} style={{
          width: "100%", padding: "14px 18px", borderRadius: 12, border: "none",
          background: "rgba(229,83,75,0.1)", color: "#e5534b",
          fontFamily: C.display, fontSize: 17, fontWeight: 600, cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <IcTrash size={15} /> {t("Izbriši sporočilo")}
        </button>
        <button onClick={onClose} style={{
          width: "100%", marginTop: 8, padding: "14px 18px", borderRadius: 12,
          border: `1px solid ${C.border}`, background: "transparent", color: C.muted,
          fontFamily: C.display, fontSize: 15.5, fontWeight: 600, cursor: "pointer",
        }}>
          {t("Prekliči")}
        </button>
      </div>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export default function ScreenChat({ user, profile }) {
  const C = useTheme();
  const t = useT();

  const userId = user?.id;

  const [view, setView]             = useState("list");
  const [convs, setConvs]           = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [stickerOpen, setStickerOpen] = useState(false);
  const [profileSheet, setProfileSheet] = useState(null);
  const [bgSheet, setBgSheet]       = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [msgMenu, setMsgMenu]       = useState(null);
  const [blocks, setBlocks]         = useState([]);
  const [clubmates, setClubmates]   = useState([]);
  const [groupSelected, setGroupSelected] = useState([]);
  const [groupName, setGroupName]   = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [convBg, setConvBg]         = useState("default");
  const [search, setSearch]         = useState("");
  const [reads, setReads]           = useState(() => loadChatReads());
  const [userQ, setUserQ]           = useState("");   // "new chat" name search
  const [userHits, setUserHits]     = useState([]);

  const msgsEndRef   = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef      = useRef(null);

  // ── Load conversations ──────────────────────────────────────
  const loadConvs = useCallback(async () => {
    if (!userId) return;
    // Demo conversations exist only in local demo mode — real accounts start
    // with an empty chat list and find people via the name search.
    if (!hasSupabase) seedProtoConvs(userId);
    try {
      const remote = await listConversations(userId);
      // Also pull from localStorage (prototype / locally sent messages)
      const LS = "athlos:v1";
      let localConvs = [];
      try {
        const state = JSON.parse(localStorage.getItem(LS)) || {};
        const chat = state.chat || {};
        localConvs = Object.values(chat.convs || {}).map(conv => {
          const convMsgs = (chat.msgs || {})[conv.id] || [];
          const lastMsg = convMsgs[convMsgs.length - 1] || null;
          const otherId = conv.id.split("~").find(p => p !== userId);
          const otherUser = conv.otherUser || PROTO_PEOPLE.find(p => p.user_id === otherId) || null;
          return { ...conv, lastMsg, otherUser };
        }).sort((a, b) => new Date(b.lastMsg?.created_at || b.created_at) - new Date(a.lastMsg?.created_at || a.created_at));
        // With a real backend, hide previously-seeded prototype conversations
        // (devices that ran an older build still carry them in localStorage).
        if (hasSupabase) localConvs = localConvs.filter(c => !String(c.id).includes("proto-"));
      } catch {}
      // Merge: remote takes precedence, local fills in the rest
      const remoteIds = new Set(remote.map(c => c.id));
      const merged = [...remote, ...localConvs.filter(c => !remoteIds.has(c.id))];
      setConvs(merged);
    } catch {}
    setLoadingConvs(false);
  }, [userId]);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // ── Load blocks & clubmates ─────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    listBlocks(userId).then(setBlocks).catch(() => {});
    listClubmates(userId).then(setClubmates).catch(() => {});
  }, [userId]);

  // ── Name search (new chat) — debounced, min 2 characters ────
  useEffect(() => {
    if (view !== "new-chat" || userQ.trim().length < 2) { setUserHits([]); return; }
    const tmr = setTimeout(() => { searchUsers(userQ).then(setUserHits).catch(() => {}); }, 300);
    return () => clearTimeout(tmr);
  }, [userQ, view]);

  // ── Load messages + poll ────────────────────────────────────
  const loadMsgs = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const remote = await listMessages(convId);
      if (remote.length > 0) { setMessages(remote); return; }
      // Fall back to localStorage (prototype convs)
      const state = JSON.parse(localStorage.getItem("athlos:v1") || "{}");
      const local = (state.chat?.msgs?.[convId] || []);
      setMessages(local);
    } catch {}
  }, []);

  useEffect(() => {
    if (view !== "detail" || !activeConv) {
      clearInterval(pollRef.current);
      return;
    }
    loadMsgs(activeConv.id);
    pollRef.current = setInterval(() => loadMsgs(activeConv.id), 4000);
    return () => clearInterval(pollRef.current);
  }, [view, activeConv?.id, loadMsgs]);

  // ── Auto-scroll ─────────────────────────────────────────────
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Open conversation ───────────────────────────────────────
  const openConv = useCallback((conv) => {
    setActiveConv(conv);
    setConvBg(conv.background || "default");
    setMessages([]);
    setInput("");
    setStickerOpen(false);
    setView("detail");
    // Mark read → clears the unread dot for this conversation (persisted).
    setReads(markChatRead(conv.id));
  }, []);

  // ── Start / open DM with a user ────────────────────────────
  const startChat = useCallback(async (otherId, otherUser) => {
    if (!userId) return;
    try {
      const conv = await getOrCreateDirectConversation(userId, otherId);
      const mate = otherUser || clubmates.find(m => m.user_id === otherId);
      openConv({ ...conv, otherUser: mate || null });
    } catch {}
  }, [userId, clubmates, openConv]);

  // ── Send message ────────────────────────────────────────────
  const doSend = useCallback(async (type = "text", content = input.trim(), attachmentUrl = null) => {
    if (!activeConv || !userId || (!content && !attachmentUrl)) return;
    const optimistic = {
      id: `opt-${Date.now()}`,
      conversation_id: activeConv.id,
      sender_id: userId, type, content,
      attachment_url: attachmentUrl,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    if (type === "text") setInput("");
    setStickerOpen(false);

    try {
      const saved = await sendMessage(activeConv.id, userId, type, content, attachmentUrl);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
      loadConvs();

      // Demo auto-reply (local/demo mode). Capture the target conversation in
      // locals so a mid-delay switch to another chat doesn't misfile the reply.
      if (!hasSupabase && activeConv.type === "direct" && type === "text" && Math.random() > 0.3) {
        const replyConvId = activeConv.id;
        const otherId = activeConv.otherUser?.user_id;
        if (otherId) {
          setTimeout(async () => {
            const reply = DEMO_AUTO_REPLIES[Math.floor(Math.random() * DEMO_AUTO_REPLIES.length)];
            await sendMessage(replyConvId, otherId, "text", reply);
            loadMsgs(replyConvId);
          }, 1400 + Math.random() * 1800);
        }
      }
    } catch {}
  }, [activeConv, userId, input, loadConvs, loadMsgs]);

  // ── File / photo / video attachment ────────────────────────
  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const isImg   = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const msgType = isImg ? "image" : isVideo ? "video" : "file";
    try {
      const url = await uploadChatFile(file, userId);
      await doSend(msgType, file.name, url);
    } catch {}
    e.target.value = "";
  }, [userId, doSend]);

  // ── Block ────────────────────────────────────────────────────
  const doBlock = useCallback(async () => {
    if (!userId || !blockTarget) return;
    await blockUser(userId, blockTarget.user_id).catch(() => {});
    setBlocks(prev => [...new Set([...prev, blockTarget.user_id])]);
    setBlockTarget(null);
    setProfileSheet(null);
    setView("list");
    loadConvs();
  }, [userId, blockTarget, loadConvs]);

  // ── Delete message ───────────────────────────────────────────
  const doDeleteMsg = useCallback(async () => {
    if (!msgMenu || !userId) return;
    const { deleteMessage } = await import("../lib/api");
    await deleteMessage(msgMenu.id, userId).catch(() => {});
    setMessages(prev => prev.filter(m => m.id !== msgMenu.id));
    setMsgMenu(null);
  }, [msgMenu, userId]);

  // ── Change background ────────────────────────────────────────
  const doChangeBg = useCallback(async (bgId) => {
    setConvBg(bgId);
    if (activeConv) {
      setActiveConv(c => c ? { ...c, background: bgId } : c);
      // Reflect immediately in the list too, so reopening without a reload
      // still shows the just-picked background.
      setConvs(list => list.map(c => c.id === activeConv.id ? { ...c, background: bgId } : c));
      await updateConversationBackground(activeConv.id, bgId).catch(() => {});
    }
    setBgSheet(false);
  }, [activeConv]);

  // ── Create group ─────────────────────────────────────────────
  const doCreateGroup = useCallback(async () => {
    if (!userId || !groupName.trim() || groupSelected.length === 0) return;
    try {
      const conv = await createGroupConversation(userId, groupName.trim(), groupSelected);
      setGroupSelected([]);
      setGroupName("");
      openConv({ ...conv, name: groupName.trim() });
    } catch {}
  }, [userId, groupName, groupSelected, openConv]);

  // ── Helpers ──────────────────────────────────────────────────
  const bgColor = BG_OPTIONS.find(b => b.id === convBg)?.color || C.bg;
  // Is the conversation sitting on a dark backdrop (dark theme or a dark
  // custom background)? Bubbles pick their surface + text from this.
  const darkBackdrop = C.name === "dark" || ["dark", "olive", "navy", "bronze"].includes(convBg);
  const textOnBg = (() => {
    const dark = ["dark", "olive", "navy", "bronze"].includes(convBg);
    return dark ? "rgba(255,255,255,0.9)" : C.text;
  })();
  const mutedOnBg = (() => {
    const dark = ["dark", "olive", "navy", "bronze"].includes(convBg);
    return dark ? "rgba(255,255,255,0.45)" : C.muted;
  })();
  const borderOnBg = (() => {
    const dark = ["dark", "olive", "navy", "bronze"].includes(convBg);
    return dark ? "rgba(255,255,255,0.12)" : C.border;
  })();
  const surfaceOnBg = (() => {
    const dark = ["dark", "olive", "navy", "bronze"].includes(convBg);
    return dark ? "rgba(255,255,255,0.06)" : C.surface;
  })();

  const convName = (conv) =>
    conv.type === "group" ? (conv.name || "Skupina") : (conv.otherUser?.name || "Neznano");
  // Single engraved initial (like a Greek monogram) — first letter of the
  // name, not a two-letter initial pair.
  const convInitials = (conv) =>
    conv.type === "group" ? "" : (conv.otherUser?.name?.trim()?.[0]?.toUpperCase() || "?");
  const lastMsgLabel = (conv) => {
    const msg = conv.lastMsg;
    if (!msg) return t("Začni pogovor");
    if (msg.type === "sticker") return "Nalepka";
    if (msg.type === "image")   return "Slika";
    if (msg.type === "video")   return "Video";
    if (msg.type === "file")    return "Datoteka";
    return msg.content || "";
  };
  const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
    const days = Math.floor((now - d) / 86400000);
    if (days < 7) return d.toLocaleDateString("sl-SI", { weekday: "short" });
    return d.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit" });
  };
  const dayLabel = (iso) => {
    const d = new Date(iso), now = new Date();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return t("DANES");
    if (d.toDateString() === yest.toDateString()) return t("VČERAJ");
    return d.toLocaleDateString("sl-SI", { day: "numeric", month: "short" }).toUpperCase();
  };

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <>
      {/* ════════════════════ LIST VIEW ════════════════════════ */}
      {view === "list" && (() => {
        const dark = C.name === "dark";
        const sep = dark ? "rgba(255,255,255,0.07)" : "rgba(28,24,20,0.08)";
        const q = search.trim().toLowerCase();
        const shown = convs.filter(c => convName(c).toLowerCase().includes(q));
        return (
        <div style={{ paddingBottom: 20 }}>
          {/* Header — engraved kicker + title with the compose seal on the same
              baseline; calmer scale and a steady 14px rhythm down to the list */}
          <div style={{ padding: "18px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div style={{ minWidth: 0 }}>
                <Mono style={{ color: C.gold, fontSize: 10, letterSpacing: "0.22em", display: "block", marginBottom: 6 }}>{t("KLUB · EKIPA")}</Mono>
                <h1 style={{ fontFamily: C.heading, fontSize: 27, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0, color: C.text, lineHeight: 1 }}>
                  {t("Pogovori")}
                </h1>
              </div>
              <Pressable
                onClick={() => setView("new-chat")}
                scale={0.9}
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 50, flexShrink: 0,
                  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent,
                  boxShadow: dark ? "none" : "0 2px 8px rgba(28,24,20,0.06)",
                }}
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
                </svg>
              </Pressable>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: "11px 16px", marginBottom: 10, boxShadow: dark ? "none" : "0 2px 8px rgba(28,24,20,0.04)" }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={C.muted2} strokeWidth={2.2} strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("Iskanje")}
                className="athlos-conv-search"
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: C.display, fontWeight: 500, color: C.text, minWidth: 0 }}
              />
              <style>{`.athlos-conv-search::placeholder { color: ${C.muted2}; font-style: italic; }`}</style>
              {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", padding: 0, fontSize: 20, lineHeight: 1 }}>×</button>}
            </div>
          </div>

          {/* Loading skeletons */}
          {loadingConvs && (
            <div style={{ padding: "4px 16px" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                  <SkeletonBlock width={52} height={52} radius={999} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    <SkeletonBlock width={`${55 - i * 4}%`} height={14} radius={5} />
                    <SkeletonBlock width={`${78 - i * 5}%`} height={12} radius={5} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loadingConvs && shown.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 24px", color: C.muted, fontFamily: C.display, fontStyle: "italic", fontSize: 17 }}>
              {q ? t("Ni zadetkov") : t("Ni pogovorov")}
            </div>
          )}

          {/* Rows — Apple Messages structure, marble medallion avatars */}
          {!loadingConvs && shown.map((conv, i) => {
            const isBlocked = conv.type === "direct" && blocks.includes(conv.otherUser?.user_id);
            // Unread = their latest message is newer than the last time we opened
            // this conversation (opening it marks it read → clears the dot).
            const unread = !!conv.lastMsg && conv.lastMsg.sender_id && conv.lastMsg.sender_id !== userId
              && (!reads[conv.id] || new Date(conv.lastMsg.created_at) > new Date(reads[conv.id]));
            const last = i === shown.length - 1;
            return (
              <button
                key={conv.id}
                onClick={() => openConv(conv)}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center",
                  padding: 0, background: "none", border: "none",
                  cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  opacity: isBlocked ? 0.45 : 1,
                }}
              >
                {/* fixed left rail keeps the unread dot centred, never clipped */}
                <span style={{ width: 22, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: unread ? C.accent : "transparent", boxShadow: unread ? `0 0 8px ${C.accent}66` : "none" }} />
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 13, flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <Avatar initials={convInitials(conv)} isGroup={conv.type === "group"} size={52} />
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "14px 0", borderBottom: last ? "none" : `1px solid ${sep}` }}>
                    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontFamily: C.display, fontWeight: unread ? 800 : 700, fontSize: 17.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {convName(conv)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.muted2, letterSpacing: "0.08em" }}>
                          {fmtTime(conv.lastMsg?.created_at || conv.created_at)}
                        </span>
                        <svg width={6} height={11} viewBox="0 0 8 13" fill="none" stroke={C.muted2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><path d="M1.5 1.5L6.5 6.5L1.5 11.5"/></svg>
                      </span>
                    </span>
                    <span style={{
                      fontFamily: C.display, fontSize: 15, fontWeight: 500, fontStyle: "italic",
                      color: unread ? C.text2 : C.muted, marginTop: 4, lineHeight: 1.35,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {isBlocked ? t("Blokirano") : lastMsgLabel(conv)}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        );
      })()}

      {/* ════════════════ DETAIL (full-screen) ═════════════════ */}
      {view === "detail" && activeConv && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 15,
          background: bgColor,
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 14px 10px",
            paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
            background: bgColor,
            borderBottom: `1px solid ${borderOnBg}`,
          }}>
            {/* Back — follows the conversation's own backdrop (borderOnBg/textOnBg),
                not the app theme, so it stays visible on a dark custom background */}
            <Pressable onClick={() => { setReads(markChatRead(activeConv.id)); setView("list"); loadConvs(); }} scale={0.88} style={{
              background: "transparent", border: `1px solid ${borderOnBg}`, borderRadius: 50,
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              color: textOnBg, marginRight: 4, lineHeight: 1, flexShrink: 0,
            }}>
              <svg width="9" height="16" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 1L1 9l8 8"/>
              </svg>
            </Pressable>

            {/* Avatar + name tap → profile sheet */}
            <button
              onClick={() => {
                if (activeConv.type === "direct" && activeConv.otherUser)
                  setProfileSheet(activeConv.otherUser);
              }}
              style={{
                background: "none", border: "none", cursor: activeConv.type === "direct" ? "pointer" : "default",
                display: "flex", alignItems: "center", gap: 10, flex: 1, textAlign: "left", padding: 0,
              }}
            >
              <Avatar initials={convInitials(activeConv)} isGroup={activeConv.type === "group"} size={38} />
              <div>
                <div style={{ fontFamily: C.heading, fontSize: 15.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: textOnBg }}>
                  {convName(activeConv)}
                </div>
                {activeConv.type === "direct" && activeConv.otherUser?.club && (
                  <Mono style={{ fontSize: 9, color: C.gold, letterSpacing: "0.22em" }}>
                    {activeConv.otherUser.club}
                  </Mono>
                )}
              </div>
            </button>

            {/* Background picker button */}
            <Pressable
              onClick={() => setBgSheet(true)}
              style={{
                background: "transparent", border: `1px solid ${borderOnBg}`, borderRadius: 50,
                width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                color: mutedOnBg,
              }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/>
                <path d="M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>
            </Pressable>
          </div>

          {/* Messages — on faintly veined, halftoned marble */}
          <div
            className="athlos-scroll"
            style={{
              flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2,
              ...(convBg === "default" && C.name !== "dark" ? {
                backgroundImage: "radial-gradient(rgba(28,24,20,0.045) 0.8px, transparent 1.2px), radial-gradient(ellipse 60% 30% at 20% 8%, rgba(216,207,189,0.35), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 30%, rgba(216,207,189,0.28), transparent 55%)",
                backgroundSize: "5px 5px, 100% 100%, 100% 100%",
              } : {}),
            }}
          >
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.7 }}>
                <Meander color={C.gold} width={120} />
                <div style={{ fontFamily: C.display, fontStyle: "italic", fontSize: 17, color: mutedOnBg }}>
                  {t("Začni pogovor")}
                </div>
              </div>
            )}

            {/* engraved inscription that opens every correspondence */}
            {messages.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 0 18px" }}>
                <Meander color={C.gold} width={96} />
                <Mono style={{ color: C.gold, fontSize: 9, letterSpacing: "0.34em", paddingLeft: "0.34em" }}>
                  {convName(activeConv)}
                </Mono>
              </div>
            )}

            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = msg.created_at && (!prev || new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString());
              const closesRun = !next || next.sender_id !== msg.sender_id ||
                (new Date(next.created_at) - new Date(msg.created_at)) > 5 * 60000;
              return (
                <React.Fragment key={msg.id}>
                  {newDay && <DayDivider label={dayLabel(msg.created_at)} C={C} muted={mutedOnBg} line={borderOnBg} />}
                  <Bubble
                    msg={msg}
                    isMine={msg.sender_id === userId}
                    C={{ ...C, text: textOnBg, muted2: mutedOnBg }}
                    onLongPress={msg.sender_id === userId ? setMsgMenu : undefined}
                    showTime={closesRun}
                    darkBg={darkBackdrop}
                  />
                </React.Fragment>
              );
            })}
            <div ref={msgsEndRef} />
          </div>

          {/* Sticker picker */}
          {stickerOpen && (
            <div style={{ background: surfaceOnBg, borderTop: `1px solid ${borderOnBg}`, padding: "10px 6px 6px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 2 }}>
                {STICKERS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput((prev) => prev + s)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 31.5, padding: "6px 2px", lineHeight: 1,
                      borderRadius: 8, WebkitTapHighlightColor: "transparent",
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Composer */}
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 7, padding: "8px 10px",
            paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))",
            background: surfaceOnBg, borderTop: `1px solid ${borderOnBg}`,
          }}>
            {/* Sticker toggle */}
            <Pressable
              onClick={() => setStickerOpen(o => !o)}
              style={{
                background: "transparent", border: `1px solid ${borderOnBg}`, borderRadius: 50,
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                color: stickerOpen ? C.accent : mutedOnBg, flexShrink: 0,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill={stickerOpen ? C.accent : "none"} stroke={stickerOpen ? C.accent : "currentColor"} strokeWidth={1.8} strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={3}/>
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={3}/>
              </svg>
            </Pressable>

            {/* File attach */}
            <Pressable
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "transparent", border: `1px solid ${borderOnBg}`, borderRadius: 50,
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                color: mutedOnBg, flexShrink: 0,
              }}
            >
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </Pressable>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,*/*"
              style={{ display: "none" }}
              onChange={handleFile}
            />

            {/* Text input — serif, on raised marble. Tied to darkBackdrop (the
                conversation's own theme/background), not the app theme, so a
                dark custom chat background never leaves it as a washed-out
                gray pill fighting the backdrop. */}
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
              placeholder={t("Sporočilo…")}
              rows={1}
              className="athlos-chat-input"
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 20,
                border: `1px solid ${darkBackdrop ? "rgba(255,255,255,0.16)" : "#D8CFBD"}`,
                background: darkBackdrop ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.55)",
                color: textOnBg, fontFamily: C.display, fontSize: 17, fontWeight: 500,
                resize: "none", outline: "none", lineHeight: 1.4,
                minHeight: 36, maxHeight: 100, overflowY: "auto",
              }}
            />
            <style>{`.athlos-chat-input::placeholder { color: ${mutedOnBg}; }`}</style>

            {/* Send — ink medallion with the electric-green arrow (signal, not fill) */}
            <Pressable
              onClick={() => doSend()}
              disabled={!input.trim()}
              style={{
                background: "linear-gradient(160deg, #26221C, #14120E)", borderRadius: 50,
                width: 38, height: 38, border: "1px solid rgba(244,239,230,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: input.trim() ? 1 : 0.35, flexShrink: 0,
                color: input.trim() ? C.accent2 : "rgba(244,239,230,0.6)",
                boxShadow: input.trim() ? "0 6px 16px rgba(28,24,20,0.28)" : "none",
                transition: "opacity 0.2s, color 0.2s, box-shadow 0.2s",
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7"/>
              </svg>
            </Pressable>
          </div>
        </div>
      )}

      {/* ═════════════ NEW CHAT (full-screen) ══════════════════ */}
      {view === "new-chat" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 15, background: C.bg, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px 10px",
            paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <BackBtn onClick={() => setView("list")} />
            <div style={{ fontFamily: C.heading, fontSize: 19, fontWeight: 700, color: C.text }}>
              Nov pogovor
            </div>
          </div>

          <div className="athlos-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            {/* Create group */}
            <button
              onClick={() => { setGroupSelected([]); setGroupName(""); setView("new-group"); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                padding: "13px 16px", marginBottom: 22,
                background: `${C.accent}10`, border: `1px solid ${C.accent}30`, borderRadius: 14,
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `${C.accent}1a`, border: `1.5px solid ${C.accent}40`,
                display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, flexShrink: 0,
              }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>
                Ustvari skupino
              </span>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round" style={{ marginLeft: "auto" }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>

            {/* Search anyone by display name (RPC — works across clubs) */}
            <Mono style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 10, letterSpacing: "0.12em" }}>
              {t("IŠČI PO IMENU")}
            </Mono>
            <input
              value={userQ}
              onChange={(e) => setUserQ(e.target.value)}
              placeholder={t("Vpiši ime …")}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 14, boxSizing: "border-box",
                border: `1px solid ${C.border2}`, background: C.surface2, color: C.text,
                fontFamily: C.display, fontWeight: 600, fontSize: 16.5, outline: "none",
                marginBottom: 6,
              }}
            />
            {userHits.filter(u => u.user_id !== userId && !blocks.includes(u.user_id)).map(u => (
              <button
                key={u.user_id}
                onClick={() => { setUserQ(""); setUserHits([]); startChat(u.user_id, u); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0", background: "none", border: "none",
                  borderBottom: `1px solid ${C.border}`,
                  cursor: "pointer", WebkitTapHighlightColor: "transparent",
                }}
              >
                <Avatar initials={u.initials} size={42} />
                <div style={{ flex: 1, textAlign: "left", fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>
                  {u.name}
                </div>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}
            {userQ.trim().length >= 2 && userHits.length === 0 && (
              <div style={{ textAlign: "center", padding: "14px 0 4px", fontFamily: C.display, fontStyle: "italic", color: C.muted, fontSize: 14.5 }}>
                {t("Ni zadetkov")}
              </div>
            )}

            <Mono style={{ color: C.muted, fontSize: 11, display: "block", margin: "22px 0 10px", letterSpacing: "0.12em" }}>
              SOTEKMOVALCI
            </Mono>

            {clubmates.filter(m => !blocks.includes(m.user_id)).map(mate => (
              <button
                key={mate.user_id}
                onClick={() => startChat(mate.user_id, mate)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0", background: "none", border: "none",
                  borderBottom: `1px solid ${C.border}`,
                  cursor: "pointer", WebkitTapHighlightColor: "transparent",
                }}
              >
                <Avatar initials={mate.initials} size={42} />
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>
                    {mate.name}
                  </div>
                  {mate.club && (
                    <Mono style={{ fontSize: 10, color: C.muted, display: "block", marginTop: 1 }}>
                      {mate.club}
                    </Mono>
                  )}
                </div>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}

            {clubmates.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 20px", fontFamily: C.display, color: C.muted, fontSize: 15.5 }}>
                {t("Nisi še v klubu — poišči prijatelja po imenu zgoraj.")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ NEW GROUP (full-screen) ════════════════ */}
      {view === "new-group" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 15, background: C.bg, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px 10px",
            paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <BackBtn onClick={() => setView("new-chat")} />
            <div style={{ fontFamily: C.heading, fontSize: 19, fontWeight: 700, color: C.text, flex: 1 }}>
              Nova skupina
            </div>
            <button
              onClick={doCreateGroup}
              disabled={!groupName.trim() || groupSelected.length === 0}
              style={{
                background: C.accent, color: C.name === "dark" ? "#04130a" : "#fff",
                border: "none", borderRadius: 20, padding: "7px 18px",
                fontFamily: C.display, fontWeight: 700, fontSize: 14.5, cursor: "pointer",
                opacity: (!groupName.trim() || groupSelected.length === 0) ? 0.38 : 1,
              }}
            >
              Ustvari
            </button>
          </div>

          <div className="athlos-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Ime skupine…"
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 14,
                border: `1.5px solid ${C.border}`,
                background: C.surface2, color: C.text, fontFamily: C.display, fontSize: 17,
                outline: "none", marginBottom: 22, boxSizing: "border-box",
              }}
            />

            <Mono style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 10, letterSpacing: "0.12em" }}>
              IZBERI ČLANE ({groupSelected.length} izbranih)
            </Mono>

            {clubmates.map(mate => {
              const sel = groupSelected.includes(mate.user_id);
              return (
                <button
                  key={mate.user_id}
                  onClick={() => setGroupSelected(s => sel ? s.filter(id => id !== mate.user_id) : [...s, mate.user_id])}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 0", background: "none", border: "none",
                    borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Avatar initials={mate.initials} size={42} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>
                      {mate.name}
                    </div>
                    {mate.club && (
                      <Mono style={{ fontSize: 10, color: C.muted, display: "block", marginTop: 1 }}>
                        {mate.club}
                      </Mono>
                    )}
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: sel ? C.accent : "transparent",
                    border: `2px solid ${sel ? C.accent : C.border2}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, border-color 0.15s",
                  }}>
                    {sel && (
                      <svg width={10} height={8} viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke={C.name === "dark" ? "#04130a" : "#fff"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────── Overlays ─────────────────────────── */}

      {profileSheet && (
        <ProfileSheet
          user={profileSheet}
          C={C} t={t}
          onClose={() => setProfileSheet(null)}
          onMessage={() => { setProfileSheet(null); startChat(profileSheet.user_id, profileSheet); }}
          onBlock={(uid) => { setBlockTarget({ user_id: uid, name: profileSheet.name }); setProfileSheet(null); }}
        />
      )}

      {bgSheet && (
        <BgSheet
          current={convBg}
          C={C} t={t}
          onSelect={doChangeBg}
          onClose={() => setBgSheet(false)}
        />
      )}

      {blockTarget && (
        <BlockConfirm
          name={blockTarget.name}
          C={C} t={t}
          onConfirm={doBlock}
          onCancel={() => setBlockTarget(null)}
        />
      )}

      {msgMenu && (
        <MsgMenu
          msg={msgMenu}
          C={C} t={t}
          onDelete={doDeleteMsg}
          onClose={() => setMsgMenu(null)}
        />
      )}
    </>
  );
}
