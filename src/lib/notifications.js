// ─────────────────────────────────────────────────────────────
// Notification signals — aggregated from state the app already keeps.
// No new backend: the morning check-in lives in localStorage
// ("athlos:wellness", written by CheckinCard) and chat unread state is
// derived the same way ScreenChat draws its per-conversation dots
// (last message from someone else, newer than the device-local read mark).
// ─────────────────────────────────────────────────────────────
import { listConversations, loadChatReads } from "./api";

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// True while today's wellness questionnaire hasn't been submitted yet.
// Keyed per user (see CheckinCard.storeKey) so a fresh account on the same
// browser doesn't inherit another account's "done today" flag.
export function checkinPendingToday(userId, now = new Date()) {
  try {
    const key = `athlos:wellness:${userId || "local"}`;
    const days = (JSON.parse(localStorage.getItem(key) || "{}").days) || {};
    return !days[isoLocal(now)];
  } catch { return true; }
}

// Conversations whose last message is unread. Mirrors the merge in
// ScreenChat.loadConvs: remote conversations win, prototype/local ones
// (stored under "athlos:v1".chat) fill in the rest.
async function unreadConvs(userId) {
  if (!userId) return [];
  let convs = [];
  try { convs = await listConversations(userId); } catch {}
  try {
    const chat = (JSON.parse(localStorage.getItem("athlos:v1") || "{}").chat) || {};
    const remoteIds = new Set(convs.map((c) => c.id));
    for (const conv of Object.values(chat.convs || {})) {
      if (remoteIds.has(conv.id)) continue;
      const msgs = (chat.msgs || {})[conv.id] || [];
      convs.push({ ...conv, lastMsg: msgs[msgs.length - 1] || null });
    }
  } catch {}
  const reads = loadChatReads();
  return convs.filter((c) =>
    c.lastMsg && c.lastMsg.sender_id && c.lastMsg.sender_id !== userId
    // prototype-seeded demo messages are days old — never count them as new
    && !String(c.lastMsg.id || "").startsWith("proto-")
    && (!reads[c.id] || new Date(c.lastMsg.created_at) > new Date(reads[c.id]))
  );
}

export async function countUnreadChats(userId) {
  return (await unreadConvs(userId)).length;
}

// Same query, plus WHEN the newest unread message arrived — the notification
// inbox shows a real timestamp rather than a made-up one.
export async function unreadChatSummary(userId) {
  const list = await unreadConvs(userId);
  let latestAt = null;
  for (const c of list) {
    const at = new Date(c.lastMsg.created_at);
    if (!Number.isNaN(+at) && (!latestAt || at > latestAt)) latestAt = at;
  }
  return { count: list.length, latestAt };
}

// ─────────────────────────────────────────────────────────────
// Read / dismissed state for the notification inbox.
//
// The notifications themselves are derived signals, recomputed on every
// render — there is no server-side inbox. So "read" and "dismissed" are the
// only things that need persisting, and they are stored per user (same
// namespacing rule as the wellness store: a second account on this browser
// must not inherit the first one's read marks).
//
// Keys are scoped BY DAY (`checkin:2026-07-21`). A bare `checkin` key would
// mean dismissing today's reminder silences it forever; the day scope makes
// tomorrow's instance a new notification, which is what the user expects.
// ─────────────────────────────────────────────────────────────
const notifKey = (userId) => `athlos:notifState:${userId || "local"}`;
const emptyState = () => ({ read: {}, dismissed: {} });

export function loadNotifState(userId) {
  try { return { ...emptyState(), ...JSON.parse(localStorage.getItem(notifKey(userId)) || "{}") }; }
  catch { return emptyState(); }
}
const saveNotifState = (userId, s) => {
  try { localStorage.setItem(notifKey(userId), JSON.stringify(s)); } catch {}
};

// Stable per-day identity for a derived notification.
export const notifUid = (id, at = new Date()) => `${id}:${isoLocal(at)}`;

export function markNotifsRead(userId, uids) {
  const s = loadNotifState(userId);
  const read = { ...s.read };
  for (const uid of [].concat(uids)) read[uid] = Date.now();
  saveNotifState(userId, { ...s, read });
}

export function dismissNotif(userId, uid) {
  const s = loadNotifState(userId);
  saveNotifState(userId, { ...s, dismissed: { ...s.dismissed, [uid]: Date.now() } });
}

// ── The inbox itself ─────────────────────────────────────────
// Single source of truth for "what is in the inbox right now", so the bell on
// Today and the list on the notifications screen can never disagree. Returns
// descriptors only — no copy, no icons — because the caller owns the language.
//
// `go` is the screen to land on; `intent` is what to do once there, for the
// cases where the screen alone isn't the whole action (tapping the check-in
// reminder must open the check-in, not merely arrive at Today).
// Pass `marks` to keep this a PURE function of its arguments — a caller that
// holds read/dismissed state in React needs the result to change when that
// state changes, and an internal localStorage read would make the recompute
// invisible to both React and the linter. Omitting it reads storage directly,
// which is only safe where the caller remounts (ScreenToday does, per
// navigation).
export function activeNotifications(userId, { chatUnread = 0, chatAt = null, now = new Date(), marks = null } = {}) {
  const morning = new Date(now); morning.setHours(7, 0, 0, 0);
  const session = new Date(now); session.setHours(17, 0, 0, 0);
  const out = [];

  if (checkinPendingToday(userId, now)) {
    out.push({ id: "checkin", at: morning, important: true, go: "today", intent: "open-checkin" });
  }
  if (chatUnread > 0) {
    out.push({ id: "chat", at: chatAt || morning, important: false, go: "chat" });
  }
  if (now < session) {
    // Important only in the last 90 minutes — an all-day alarm is ignored.
    out.push({ id: "train", at: morning, important: session - now <= 90 * 60000, go: "train" });
  }

  const m = marks || loadNotifState(userId);
  return out
    .map((n) => {
      const uid = notifUid(n.id, now);
      return { ...n, uid, unread: !m.read[uid] };
    })
    .filter((n) => !m.dismissed[n.uid])
    .sort((a, b) => b.at - a.at);
}

// What the bell should show. Counts UNREAD notifications rather than raw
// signals, so clearing the inbox actually clears the dot.
export function unreadNotificationCount(userId, opts) {
  return activeNotifications(userId, opts).filter((n) => n.unread).length;
}

// Housekeeping: day-scoped keys accumulate forever otherwise. Called once when
// the inbox mounts, so it costs nothing on the hot path.
export function pruneNotifState(userId, keepDays = 21) {
  const cutoff = Date.now() - keepDays * 864e5;
  const s = loadNotifState(userId);
  const keep = (bag) => Object.fromEntries(
    Object.entries(bag || {}).filter(([, ts]) => typeof ts === "number" && ts > cutoff)
  );
  saveNotifState(userId, { read: keep(s.read), dismissed: keep(s.dismissed) });
}
