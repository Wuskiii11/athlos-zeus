// Live training session store (spec §07 · Live trening widget).
//
// A web app can't touch the OS lock screen (ActivityKit / foreground
// service are native-only — see spec "Tehnično"), so this is the web
// equivalent: ScreenTrain publishes the state of the active workout here,
// and a sticky in-app bar renders it across every tab. The mock lockscreen
// demo reads the same state.
//
// Shape: { focus, block, exName, setDone, setsTotal, reps, load, unit,
//          nextName, startedAt, resting, restUntil } | null

let state = null;
const subs = new Set();

export const getLive = () => state;

export function setLive(patch) {
  state = patch === null ? null : { ...(state || {}), ...patch };
  subs.forEach((f) => f(state));
}

export const clearLive = () => setLive(null);

export function subscribeLive(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function fmtElapsed(startedAt, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
