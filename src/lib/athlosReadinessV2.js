// ATHLOS — Readiness & Load engine V2 ("sidrna" / anchored form).
// 1:1 JavaScript port of docs/readiness/athlos_readiness.py, which implements
// docs/readiness/SPEC-formule-tehnicno.md. Recovery is the anchor; Freshness
// and Wellness nudge it ±; overload (ACWR) and bad-wellness patterns punish.
//
// Input series: [{ date: "YYYY-MM-DD", rec: 0–100|null, load: number }] sorted
// ascending. `load` is the whole-day load (training TRIMP + calorie background)
// — precomputed by scripts/build-whoop-demo.mjs for the bundled demo data.

// Coach-tunable parameters — same names & defaults as the Python `P` dict.
export const P = {
  // --- Freshness (load balance) ---
  tau_acute: 7,              // fatigue memory, days (smaller = more reactive)
  tau_chronic: 28,           // fitness memory, days
  // --- Recovery asymmetry ---
  recovery_baseline_dni: 7,  // window for the athlete's "normal" recovery
  gain_navzgor: 0.60,        // how much a good day after a bad week counts
  gain_navzdol: 0.25,        // how much a bad day after a good week counts
  // --- Weights in the readiness equation (anchored V2) ---
  beta_freshness: 0.35,
  beta_wellness: 0.15,
  // --- Penalties ---
  acwr_prag: 1.30,           // ACWR above this triggers the overload penalty
  acwr_kazen_faktor: 40,
  wellness_prag: 50,         // below this a wellness day counts as "bad"
  wellness_kazen_max: 0.25,
  wellness_kazen_ref: 40,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Log-compress daily load onto the 0–21 strain scale (like Whoop).
// Lref/Lmax are derived from the athlete's own history, as in the Python.
export function strainScale(series) {
  const pos = series.filter((c) => c.load > 0).map((c) => c.load).sort((a, b) => a - b);
  if (!pos.length) return series.map((c) => ({ ...c, strain: 0 }));
  const median = pos[Math.floor(pos.length / 2)];
  const Lref = median * 0.5;
  const Lmax = pos[Math.max(0, Math.floor(0.99 * pos.length) - 1)];
  return series.map((c) => ({
    ...c,
    strain: c.load <= 0 ? 0 : Math.min(21, (21 * Math.log(1 + c.load / Lref)) / Math.log(1 + Lmax / Lref)),
  }));
}

// Wellness values (0–100) of the last 7 days up to index i, from a
// { "YYYY-MM-DD": value } map. Only entered days count (same as Python).
function wellnessWindow(series, i, wellnessMap) {
  const out = [];
  for (let j = Math.max(0, i - 6); j <= i; j++) {
    const v = wellnessMap[series[j].date];
    if (v != null) out.push(v);
  }
  return out;
}

// Main computation: EWMA lag-1 freshness, asymmetric R_eff, anchored readiness.
// Returns a new array with ATL/CTL/ACWR/F/Reff/W_eff/penalties/readiness/strain.
export function computeSeries(rawSeries, wellnessMap = {}, params = P) {
  const p = { ...P, ...params };
  const series = strainScale(rawSeries.map((c) => ({ ...c })));
  const aA = 1 - Math.exp(-1 / p.tau_acute);
  const aC = 1 - Math.exp(-1 / p.tau_chronic);
  let eA = null, eC = null;

  series.forEach((c, i) => {
    // ATL/CTL as of YESTERDAY (lag-1): today isn't trained yet.
    c.ATL = eA != null ? eA : c.load;
    c.CTL = Math.max(eC != null ? eC : c.load, 1e-6);
    eA = eA == null ? c.load : eA + aA * (c.load - eA);
    eC = eC == null ? c.load : eC + aC * (c.load - eC);

    const TSB = c.CTL - c.ATL;
    c.ACWR = c.ATL / c.CTL;
    c.F = 100 / (1 + Math.exp((-4 * TSB) / c.CTL));

    // Asymmetric recovery (the anchor).
    const prior = series
      .slice(Math.max(0, i - p.recovery_baseline_dni), i)
      .map((cc) => cc.rec)
      .filter((r) => r != null);
    if (c.rec != null && prior.length) {
      const base = prior.reduce((a, b) => a + b, 0) / prior.length;
      const d = c.rec - base;
      const g = d >= 0 ? p.gain_navzgor : p.gain_navzdol;
      c.Reff = clamp(base + g * d, 0, 100);
    } else {
      c.Reff = c.rec;
    }

    // Wellness: today + 7-day trend, plus the bad-pattern penalty.
    const wDays = wellnessWindow(series, i, wellnessMap);
    let W_eff, wellGuard;
    if (wDays.length) {
      const wToday = wDays[wDays.length - 1];
      const w7 = wDays.reduce((a, b) => a + b, 0) / wDays.length;
      W_eff = 0.25 * wToday + 0.75 * w7;
      const S = wDays.reduce((a, w) => a + Math.max(0, p.wellness_prag - w), 0) / wDays.length;
      wellGuard = clamp(1 - p.wellness_kazen_max * (S / p.wellness_kazen_ref), 1 - p.wellness_kazen_max, 1);
    } else {
      W_eff = 50;      // neutral when wellness isn't measured
      wellGuard = 1;
    }
    const wellnessPen = (1 - wellGuard) * 50;
    const overloadPen = Math.max(0, c.ACWR - p.acwr_prag) * p.acwr_kazen_faktor;

    c.W_eff = W_eff;
    c.overloadPen = overloadPen;
    c.wellnessPen = wellnessPen;
    c.readiness = c.Reff == null ? null : clamp(
      c.Reff
        + p.beta_freshness * (c.F - 50)
        + p.beta_wellness * (W_eff - 50)
        - overloadPen
        - wellnessPen,
      0, 100
    );
  });
  return series;
}
