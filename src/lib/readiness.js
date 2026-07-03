// ATHLOS — Readiness / Battery engine.
// Implements the model from docs "Athlos — Readiness / Battery sistem":
// a composite 0–100 % from weighted sub-scores, on a 7-day rolling window,
// with a season modulator and a menstrual-cycle modulator. Weights are the
// doc's placeholders (calibrated after the pilot).

export const WEIGHTS = {
  recovery: 0.30,  // HRV / RHR / sleep
  wellness: 0.25,  // morning questionnaire
  velocity: 0.20,  // bar-speed feedback from the main lift
  nutrition: 0.15, // 7-day macro/calorie average
  hydration: 0.10, // fluids + weekly weight
};

export const COMPONENT_META = {
  recovery:  { label: "Regeneracija", sub: "HRV · RHR · spanec" },
  wellness:  { label: "Počutje",      sub: "Jutranji vprašalnik" },
  velocity:  { label: "Hitrost",      sub: "AI iz glavnega dviga" },
  nutrition: { label: "Prehrana",     sub: "7-dnevno povprečje" },
  hydration: { label: "Hidracija",    sub: "Tekočina + teža" },
};

const clamp = (n) => Math.max(0, Math.min(100, n));

// Sub-score from a value vs. the athlete's personal baseline (rolling average),
// not the absolute number — exactly as the doc specifies.
export function deviationScore(value, baseline, { higherBetter = true, sensitivity = 0.5 } = {}) {
  if (value == null || baseline == null || baseline === 0) return null;
  const dev = (value - baseline) / baseline;          // fractional deviation
  const signed = higherBetter ? dev : -dev;
  return clamp(Math.round(50 + (signed / sensitivity) * 50));
}

// Recovery sub-score = weighted avg of HRV (higher better), RHR (lower better),
// sleep duration vs target. Any missing input is skipped.
export function recoveryScore({ hrv, hrvBase, rhr, rhrBase, sleepH, sleepTarget = 8 } = {}) {
  const parts = [];
  const h = deviationScore(hrv, hrvBase, { higherBetter: true });
  const r = deviationScore(rhr, rhrBase, { higherBetter: false });
  const s = sleepH != null ? clamp(Math.round((sleepH / sleepTarget) * 100)) : null;
  [h, r, s].forEach((v) => v != null && parts.push(v));
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;
}

// Composite readiness. `sub` holds 0–100 sub-scores per component (missing ones
// are dropped and their weight is redistributed over the present ones — doc §3).
export function computeReadiness(sub, { season = "mid", cycleModifier = 1 } = {}) {
  const present = Object.keys(WEIGHTS).filter((k) => typeof sub[k] === "number");
  const totalW = present.reduce((s, k) => s + WEIGHTS[k], 0) || 1;
  let score = present.reduce((s, k) => s + sub[k] * (WEIGHTS[k] / totalW), 0);
  score *= cycleModifier;                              // luteal phase etc.
  if (season === "off") score = score + (100 - score) * 0.4; // off-season barely gates training
  const battery = clamp(Math.round(score));
  const components = present.map((k) => ({
    key: k, score: clamp(Math.round(sub[k])), weight: WEIGHTS[k], ...COMPONENT_META[k],
  }));
  return { battery, components, season };
}

// Maps battery % → today's training recommendation (doc §4 thresholds).
export function recommendation(battery) {
  if (battery >= 70) return { key: "full",  text: "Sistem priporoča poln trening",        tone: "accent" };
  if (battery >= 40) return { key: "light", text: "Razmisli o lažjem treningu danes",      tone: "yellow" };
  return { key: "rest", text: "Regeneracija je nizka — danes počivaj",                     tone: "red" };
}

// Acute (7-day) vs chronic (28-day) load ratio — overreaching flag (doc §1, §4).
export function loadRatio(acute7, chronic28) {
  if (!chronic28) return null;
  const r = acute7 / chronic28;
  return { ratio: +r.toFixed(2), overreaching: r > 1.5, detraining: r < 0.8 };
}

// Subjective morning questionnaire → 0–100. soreness & stress are "bad when
// high", so they're inverted before averaging (doc §2.3).
export function wellnessScore({ sleepQuality, mood, soreness, stress } = {}, scale = 5) {
  const vals = [sleepQuality, mood, scale + 1 - soreness, scale + 1 - stress].filter((v) => typeof v === "number");
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;     // 1..scale
  return clamp(Math.round(((avg - 1) / (scale - 1)) * 100));
}

// Hydration sub-score = today's fluid intake as % of the recommended amount.
export function hydrationScore(pct) {
  return pct == null ? null : clamp(Math.round(pct));
}

// The defaults that drive the demo (~84 %). The check-in overrides these live.
export const DEFAULT_CHECKIN = {
  hrv: 72, hrvBase: 68, rhr: 58, rhrBase: 60, sleepH: 7.7, sleepTarget: 8,
  sleepQuality: 4, mood: 4, soreness: 2, stress: 2,
  hydration: 86, nutrition: 79, velocity: 88,
  season: "mid", cycleModifier: 1,
};

// Build the full readiness from a (partial) check-in, filling gaps with defaults.
export function readinessFromCheckin(checkin = {}) {
  const c = { ...DEFAULT_CHECKIN, ...checkin };
  const recovery = recoveryScore(c);
  const wellness = wellnessScore(c);
  const hydration = hydrationScore(c.hydration);
  return computeReadiness(
    { recovery, wellness, velocity: c.velocity, nutrition: c.nutrition, hydration },
    { season: c.season, cycleModifier: c.cycleModifier }
  );
}

// Back-compat: the static demo number.
export function demoReadiness() {
  return readinessFromCheckin();
}
