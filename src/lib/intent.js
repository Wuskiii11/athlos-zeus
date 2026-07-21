// ─────────────────────────────────────────────────────────────
// One-shot navigation intent.
//
// `go("today")` says WHICH screen to land on. It cannot say what to do once
// you are there, which is exactly what a notification needs: tapping the
// morning check-in reminder has to open the check-in, not merely arrive at
// the Today screen and leave the user to find it.
//
// A module singleton rather than sessionStorage: nothing needs to survive a
// reload (an intent that outlived the tap that created it would fire at a
// baffling moment), and App.jsx re-keys the screen container on every
// navigation, so the destination always mounts fresh and its mount effect is
// a reliable place to consume this.
//
// Read exactly once. takeIntent() clears as it reads, so a screen that
// remounts for an unrelated reason cannot replay the action.
// ─────────────────────────────────────────────────────────────

let pending = null;

export function setIntent(name) {
  pending = name || null;
}

// True if `name` was the pending intent — and consumes it.
export function takeIntent(name) {
  if (pending !== name) return false;
  pending = null;
  return true;
}

export function clearIntent() {
  pending = null;
}
