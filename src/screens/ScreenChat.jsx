import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../theme";
import { BackBtn, Pressable, Mono } from "../components/UI";
import { IcTrash } from "../components/Icons";
import { useT } from "../lib/i18n";
import {
  listConversations, listMessages, sendMessage, listClubmates,
  getOrCreateDirectConversation, createGroupConversation,
  blockUser, listBlocks, updateConversationBackground,
  uploadChatFile, hasSupabase,
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
  { user_id: "proto-nina",  name: "Nina Mlakar",    initials: "NM", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-tim",   name: "Tim Žagar",      initials: "TŽ", club: "NK Domžale", sport: "Nogomet" },
  { user_id: "proto-eva",   name: "Eva Horvat",     initials: "EH", club: "NK Domžale", sport: "Atletika" },
];
const PROTO_SEEDS = [
  { otherId: "proto-nina",  msgs: [
    { from: "proto-nina", text: "Živjo! Jutri trening ob 17:00.", ago: 82 },
    { from: "me",         text: "Super, sem tam!", ago: 80 },
    { from: "proto-nina", text: "Odlično, se vidiva!", ago: 79 },
  ]},
  { otherId: "proto-tim",   msgs: [
    { from: "proto-tim",  text: "Kaj kažeš za skupinski trening v soboto?", ago: 200 },
    { from: "me",         text: "Zveni dobro, ob kateri uri?", ago: 198 },
    { from: "proto-tim",  text: "10:00, zbiralište pri dvorani", ago: 197 },
  ]},
  { otherId: "proto-eva",   msgs: [
    { from: "proto-eva",  text: "Pogledala sem tvoje čase — odlično napredovanje!", ago: 300 },
    { from: "me",         text: "Hvala! Trdo delam.", ago: 298 },
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
// Marble disc with a bronze ring — engraved initials, like a small medallion.
function Avatar({ initials = "?", size = 44, isGroup }) {
  const C = useTheme();
  const dark = C.name === "dark";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: dark
        ? "radial-gradient(circle at 38% 32%, #1F2420, #14120E 80%)"
        : "radial-gradient(circle at 38% 32%, #FBF7EF, #EFE8D8 75%, #E4DAC6 100%)",
      border: `1.5px solid ${C.gold}55`,
      boxShadow: dark ? "none" : "inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 6px rgba(28,24,20,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: C.heading, fontWeight: 700, fontSize: size * 0.3, letterSpacing: "0.04em",
      color: isGroup ? C.gold : (dark ? C.text : "#1C1814"),
    }}>
      {isGroup ? (
        <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ) : initials}
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
      <Mono style={{ color: muted, fontSize: 8, letterSpacing: "0.28em" }}>{label}</Mono>
      <span style={{ flex: 1, height: 1, background: line }} />
    </div>
  );
}

// ─── Message bubble ──────────────────────────────────────────
// The correspondence reads like a classical dialogue: the other side speaks
// in italic Cormorant on a marble tablet; my replies are engraved ink panels
// with a faint green "oracle" breath in the corner. Timestamps only close a
// run of messages, like a catalog mark.
function Bubble({ msg, isMine, C, onLongPress, showTime = true }) {
  const isSticker = msg.type === "sticker";
  if (isSticker) {
    return (
      <div style={{ textAlign: isMine ? "right" : "left", margin: "4px 0" }}>
        <span
          onContextMenu={e => { e.preventDefault(); onLongPress?.(msg); }}
          style={{ fontSize: 56, lineHeight: 1.1, display: "inline-block", cursor: "context-menu" }}
        >{msg.content}</span>
      </div>
    );
  }

  const isImage = msg.type === "image";
  const isVideo = msg.type === "video";
  const isFile  = msg.type === "file";
  // Mine = dark "ink" panel with warm marble text (the premium statement of the
  // design system); theirs = raised marble surface with a vein border. The
  // electric green stays a signal, never a bubble fill.
  const dark = C.name === "dark";
  const bgBubble = isMine
    ? "linear-gradient(160deg, #26221C, #1C1814)"
    : (dark ? "rgba(255,255,255,0.07)" : "linear-gradient(170deg, #FCF9F2, #F0E9DA)");
  const bubbleBorder = isMine
    ? "1px solid rgba(244,239,230,0.10)"
    : `1px solid ${dark ? "rgba(255,255,255,0.10)" : "#D8CFBD"}`;
  const textColor = isMine ? "#F4EFE6" : C.text;

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
          boxShadow: isMine ? "0 6px 16px rgba(28,24,20,0.18)" : (dark ? "none" : "0 3px 10px rgba(28,24,20,0.05)"),
        }}
      >
        {/* faint oracle breath in the corner of my ink panels */}
        {isMine && msg.type === "text" && (
          <span aria-hidden="true" style={{ position: "absolute", right: -14, top: -14, width: 56, height: 56, background: "radial-gradient(circle, rgba(0,255,135,0.16), transparent 70%)", pointerEvents: "none" }} />
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
            <span style={{ fontFamily: C.display, fontSize: 13, fontWeight: 600 }}>
              {msg.content || "Datoteka"}
            </span>
          </div>
        )}
        {msg.type === "text" && (
          <span style={{
            fontFamily: C.display, fontSize: isMine ? 15 : 15.5, fontWeight: 500, lineHeight: 1.45,
            fontStyle: isMine ? "normal" : "italic", position: "relative",
          }}>
            {msg.content}
          </span>
        )}
      </div>
      {showTime && (
        <Mono style={{ fontSize: 8, color: C.muted2, margin: "3px 4px", letterSpacing: "0.12em" }}>
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
            fontFamily: C.heading, fontSize: 26, fontWeight: 700, color: C.accent,
          }}>{user?.initials || "?"}</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: C.heading, fontSize: 19, fontWeight: 700, color: C.text, letterSpacing: "0.04em" }}>
              {user?.name}
            </div>
            {user?.sport && (
              <Mono style={{ color: C.accent, fontSize: 10, display: "block", marginTop: 3 }}>
                {user.sport}
              </Mono>
            )}
            {user?.club && (
              <Mono style={{ color: C.muted, fontSize: 10, display: "block", marginTop: 2 }}>
                {user.club}
              </Mono>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onMessage} style={{
            padding: "15px", borderRadius: 14, border: "none",
            background: C.accent, color: C.name === "dark" ? "#04130a" : "#fff",
            fontFamily: C.display, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>
            {t("Pošlji sporočilo")}
          </button>
          <button onClick={() => onBlock(user?.user_id)} style={{
            padding: "15px", borderRadius: 14, border: "1px solid rgba(229,83,75,0.35)",
            background: "transparent", color: "#e5534b",
            fontFamily: C.display, fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>
            {t("Blokiraj")}
          </button>
          <button onClick={onClose} style={{
            padding: "13px", borderRadius: 14, border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted,
            fontFamily: C.display, fontSize: 14, fontWeight: 600, cursor: "pointer",
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
        <div style={{ fontFamily: C.heading, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
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
                fontFamily: C.display, fontSize: 9, fontWeight: 700,
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
        <div style={{ fontFamily: C.heading, fontSize: 17, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 8 }}>
          {t("Blokiraj")} {name}
        </div>
        <div style={{ fontFamily: C.display, fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 22, lineHeight: 1.4 }}>
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
          fontFamily: C.display, fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <IcTrash size={15} /> {t("Izbriši sporočilo")}
        </button>
        <button onClick={onClose} style={{
          width: "100%", marginTop: 8, padding: "14px 18px", borderRadius: 12,
          border: `1px solid ${C.border}`, background: "transparent", color: C.muted,
          fontFamily: C.display, fontSize: 14, fontWeight: 600, cursor: "pointer",
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

  const msgsEndRef   = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef      = useRef(null);

  // ── Load conversations ──────────────────────────────────────
  const loadConvs = useCallback(async () => {
    if (!userId) return;
    // Seed prototype conversations into localStorage on first load
    seedProtoConvs(userId);
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

      // Demo auto-reply (local/demo mode)
      if (!hasSupabase && activeConv.type === "direct" && type === "text" && Math.random() > 0.3) {
        const otherId = activeConv.otherUser?.user_id;
        if (otherId) {
          setTimeout(async () => {
            const reply = DEMO_AUTO_REPLIES[Math.floor(Math.random() * DEMO_AUTO_REPLIES.length)];
            await sendMessage(activeConv.id, otherId, "text", reply);
            loadMsgs(activeConv.id);
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
      await updateConversationBackground(activeConv.id, bgId).catch(() => {});
      setActiveConv(c => c ? { ...c, background: bgId } : c);
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
  const convInitials = (conv) =>
    conv.type === "group" ? "" : (conv.otherUser?.initials || "?");
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
      {view === "list" && (
        <div style={{ paddingBottom: 20 }}>
          <div style={{ padding: "10px 18px 0" }}>
            <Mono style={{ color: C.gold, fontSize: 9, letterSpacing: "0.4em" }}>ΑΓΟΡΑ</Mono>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 18px" }}>
              <h1 style={{ fontFamily: C.heading, fontWeight: 700, fontSize: 26, margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", color: C.text }}>
                {t("Pogovori")}
              </h1>
              <Pressable
                onClick={() => setView("new-chat")}
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 50,
                  width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.accent,
                }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </Pressable>
            </div>
          </div>

          <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingConvs && (
              <div style={{ textAlign: "center", padding: 40, fontFamily: C.display, color: C.muted, fontSize: 14 }}>
                Nalagam…
              </div>
            )}

            {!loadingConvs && convs.length === 0 && (
              <div style={{ textAlign: "center", padding: "56px 0" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ filter: `drop-shadow(0 0 16px ${C.accent}88)` }}>
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                      <path d="M6 8a4 4 0 014-4h32a4 4 0 014 4v24a4 4 0 01-4 4H30l-8 8v-8H10a4 4 0 01-4-4V8z" fill={C.accent} fillOpacity="0.15" stroke={C.accent} strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M16 18h20M16 25h14" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ fontFamily: C.heading, fontSize: 16, color: C.text, marginBottom: 6 }}>
                  Ni pogovorov
                </div>
                <div style={{ fontFamily: C.display, fontSize: 13, color: C.muted }}>
                  Klikni + za nov pogovor
                </div>
              </div>
            )}

            {/* airy full-width rows on the marble bg — hairline dividers, big touch targets */}
            {convs.map((conv, i) => {
              const isBlocked = conv.type === "direct" && blocks.includes(conv.otherUser?.user_id);
              return (
                <button
                  key={conv.id}
                  onClick={() => openConv(conv)}
                  style={{
                    width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 4px", background: "none", border: "none",
                    borderBottom: i < convs.length - 1 ? `1px solid ${C.name === "dark" ? "rgba(255,255,255,0.07)" : "rgba(28,24,20,0.08)"}` : "none",
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                    opacity: isBlocked ? 0.4 : 1,
                  }}
                >
                  <Avatar initials={convInitials(conv)} isGroup={conv.type === "group"} size={48} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 16.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {convName(conv)}
                      </span>
                      <Mono style={{ color: C.muted2, fontSize: 8, flexShrink: 0 }}>
                        {fmtTime(conv.lastMsg?.created_at || conv.created_at)}
                      </Mono>
                    </span>
                    <span style={{
                      display: "block", fontFamily: C.display, fontSize: 14, fontWeight: 500, color: C.muted, marginTop: 3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {isBlocked ? t("Blokirano") : lastMsgLabel(conv)}
                    </span>
                  </span>
                  <span style={{ color: C.muted2, fontSize: 16, flexShrink: 0 }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
            <BackBtn onClick={() => { setView("list"); loadConvs(); }} />

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
                <div style={{ fontFamily: C.heading, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: textOnBg }}>
                  {convName(activeConv)}
                </div>
                {activeConv.type === "direct" && activeConv.otherUser?.club && (
                  <Mono style={{ fontSize: 8, color: C.gold, letterSpacing: "0.22em" }}>
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
                <div style={{ fontFamily: C.display, fontStyle: "italic", fontSize: 15, color: mutedOnBg }}>
                  {t("Začni pogovor")}
                </div>
              </div>
            )}

            {/* engraved inscription that opens every correspondence */}
            {messages.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 0 18px" }}>
                <Meander color={C.gold} width={96} />
                <Mono style={{ color: C.gold, fontSize: 8, letterSpacing: "0.34em", paddingLeft: "0.34em" }}>
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
                    onClick={() => doSend("sticker", s)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 28, padding: "6px 2px", lineHeight: 1,
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

            {/* Text input — serif, on raised marble */}
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
              placeholder={t("Sporočilo…")}
              rows={1}
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 20,
                border: `1px solid ${C.name === "dark" ? borderOnBg : "#D8CFBD"}`,
                background: C.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
                color: textOnBg, fontFamily: C.display, fontSize: 15, fontWeight: 500,
                resize: "none", outline: "none", lineHeight: 1.4,
                minHeight: 36, maxHeight: 100, overflowY: "auto",
              }}
            />

            {/* Send — ink medallion with the electric-green arrow (signal, not fill) */}
            <Pressable
              onClick={() => doSend()}
              disabled={!input.trim()}
              style={{
                background: "linear-gradient(160deg, #26221C, #14120E)", borderRadius: 50,
                width: 38, height: 38, border: "1px solid rgba(244,239,230,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: input.trim() ? 1 : 0.35, flexShrink: 0,
                color: input.trim() ? "#00FF87" : "rgba(244,239,230,0.6)",
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
            <div style={{ fontFamily: C.heading, fontSize: 17, fontWeight: 700, color: C.text }}>
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
              <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color: C.text }}>
                Ustvari skupino
              </span>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round" style={{ marginLeft: "auto" }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>

            <Mono style={{ color: C.muted, fontSize: 10, display: "block", marginBottom: 10, letterSpacing: "0.12em" }}>
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
                  <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color: C.text }}>
                    {mate.name}
                  </div>
                  {mate.club && (
                    <Mono style={{ fontSize: 9, color: C.muted, display: "block", marginTop: 1 }}>
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
              <div style={{ textAlign: "center", padding: 40, fontFamily: C.display, color: C.muted, fontSize: 14 }}>
                Ni sotekmovalcev v klubu
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
            <div style={{ fontFamily: C.heading, fontSize: 17, fontWeight: 700, color: C.text, flex: 1 }}>
              Nova skupina
            </div>
            <button
              onClick={doCreateGroup}
              disabled={!groupName.trim() || groupSelected.length === 0}
              style={{
                background: C.accent, color: C.name === "dark" ? "#04130a" : "#fff",
                border: "none", borderRadius: 20, padding: "7px 18px",
                fontFamily: C.display, fontWeight: 700, fontSize: 13, cursor: "pointer",
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
                background: C.surface2, color: C.text, fontFamily: C.display, fontSize: 15,
                outline: "none", marginBottom: 22, boxSizing: "border-box",
              }}
            />

            <Mono style={{ color: C.muted, fontSize: 10, display: "block", marginBottom: 10, letterSpacing: "0.12em" }}>
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
                    <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15, color: C.text }}>
                      {mate.name}
                    </div>
                    {mate.club && (
                      <Mono style={{ fontSize: 9, color: C.muted, display: "block", marginTop: 1 }}>
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
