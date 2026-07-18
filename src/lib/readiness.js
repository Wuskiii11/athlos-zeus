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
  // Invert soreness/stress only where they're real numbers — otherwise
  // `scale + 1 - undefined` is NaN, and NaN silently passes `typeof === "number"`,
  // so an unanswered question would corrupt the average instead of being skipped.
  const vals = [
    sleepQuality,
    mood,
    typeof soreness === "number" ? scale + 1 - soreness : undefined,
    typeof stress === "number" ? scale + 1 - stress : undefined,
  ].filter((v) => typeof v === "number");
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;     // 1..scale
  return clamp(Math.round(((avg - 1) / (scale - 1)) * 100));
}

// Hydration sub-score = today's fluid intake as % of the recommended amount.
export function hydrationScore(pct) {
  return pct == null ? null : clamp(Math.round(pct));
}

// Only real, user-facing fields get a default — no wearable exists for a
// real athlete, so hrv/rhr/nutrition/velocity are never fabricated (they
// were previously baked in at flattering values, ~84%, for EVERY user
// regardless of whether they'd opened the app). sleepTarget is a constant,
// not a measurement, so it's fine to default.
export const DEFAULT_CHECKIN = {
  sleepTarget: 8,
  season: "mid", cycleModifier: 1,
};

// Build readiness from a REAL check-in only — every subscore that isn't
// present (never measured, never entered) is simply excluded, and
// computeReadiness() redistributes weight over what's actually known. A
// user with no fields at all gets battery 0 (present = [], score = 0) —
// callers should treat that as "no data yet", not a real 0% reading.
export function readinessFromCheckin(checkin = {}) {
  const c = { ...DEFAULT_CHECKIN, ...checkin };
  const recovery = (c.hrv != null || c.rhr != null || c.sleepH != null) ? recoveryScore(c) : null;
  const wellness = wellnessScore(c);
  const hydration = c.hydration != null ? hydrationScore(c.hydration) : null;
  return computeReadiness(
    { recovery, wellness, hydration },
    { season: c.season, cycleModifier: c.cycleModifier }
  );
}
