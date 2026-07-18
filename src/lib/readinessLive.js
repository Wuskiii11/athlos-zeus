// Bridges the real V2 readiness engine into the app's Today screen.
// Data: bundled Whoop demo series (whoopDemo.json, built by
// scripts/build-whoop-demo.mjs). Today's morning check-in feeds the
// wellness pillar live; everything else comes from the wearable history.
import demo from "./whoopDemo.json";
import { computeSeries } from "./athlosReadinessV2";
import { wellnessScore } from "./readiness";

export const hasWhoopDemo = Array.isArray(demo) && demo.length > 7;

// Same return shape as readinessFromCheckin ({ battery, components, season })
// so the Today screen renders unchanged. `day` carries the raw engine fields
// (ACWR, penalties, strain) for anything that wants the detail.
export function readinessFromWhoop(checkin = {}) {
  const w = wellnessScore(checkin);
  const lastDate = demo[demo.length - 1]?.date;
  const wellnessMap = w != null && lastDate ? { [lastDate]: w } : {};
  const series = computeSeries(demo, wellnessMap);
  const day = series[series.length - 1] || {};

  const battery = Math.max(0, Math.min(100, Math.round(day.readiness ?? 50)));
  const components = [
    { key: "recovery",  score: Math.round(day.Reff ?? 0),   weight: 1.0,  label: "Recovery",  sub: "Wearable · asymmetric anchor" },
    { key: "freshness", score: Math.round(day.F ?? 50),     weight: 0.35, label: "Freshness", sub: "Load balance · EWMA lag-1" },
    { key: "wellness",  score: Math.round(day.W_eff ?? 50), weight: 0.15, label: "Wellness",  sub: "Morning check-in" },
  ];
  return { battery, components, season: checkin.season || "mid", day };
}

// Last N days of computed readiness/strain — for trend charts.
export function whoopSeries(days = 30) {
  const series = computeSeries(demo, {});
  return series.slice(-days);
}
