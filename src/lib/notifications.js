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
export function checkinPendingToday(now = new Date()) {
  try {
    const days = (JSON.parse(localStorage.getItem("athlos:wellness") || "{}").days) || {};
    return !days[isoLocal(now)];
  } catch { return true; }
}

// Number of conversations with an unread last message. Mirrors the merge in
// ScreenChat.loadConvs: remote conversations win, prototype/local ones
// (stored under "athlos:v1".chat) fill in the rest.
export async function countUnreadChats(userId) {
  if (!userId) return 0;
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
    && (!reads[c.id] || new Date(c.lastMsg.created_at) > new Date(reads[c.id]))
  ).length;
}
