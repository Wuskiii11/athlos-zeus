// ATHLOS — Daily Coach template bank.
//
// Every template is a function of the real metrics (never a hardcoded single
// string) so it can embed the athlete's actual numbers. `**...**` marks the
// span DailyCoachCard bolds — this file never touches JSX/styling directly,
// keeping copy fully separate from rendering (DailyCoachAnimations/Card own
// the visuals). Base language is Slovenian; every string is written to be
// passed through the app's own `t()` at render time, same as the rest of
// ATHLOS, so it's translation-ready without a new i18n mechanism.

import type { DailyCoachMetrics } from "./DailyCoachRules";

type Tpl = (m: DailyCoachMetrics) => string;

const pct = (n: number) => `${Math.round(n)}%`;
const hrs = (h: number) => {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins > 0 ? `${whole}h ${mins}min` : `${whole}h`;
};
const one = (n: number) => n.toFixed(1);

// ── TITLE — the one-line opener ─────────────────────────────────────────
export const TITLE: Record<string, Tpl[]> = {
  noData: [
    () => "Danes še ni check-ina — nekaj minut, in ATHLOS zna povedati, kje si.",
    () => "Tvoj dan še čaka na prvi vpogled. Izpolni jutranji check-in spodaj.",
  ],
  recoveryHigh: [
    (m) => `Danes si pristal skoraj točno tam, kjer je telo pričakovalo — **${pct(m.battery!)} pripravljenosti**.`,
    (m) => `Odlično okrevanje danes: **${pct(m.battery!)}**. Telo je pripravljeno na zahtevnejši dan.`,
    (m) => `Zelena luč — pripravljenost je danes na **${pct(m.battery!)}**.`,
  ],
  recoveryMid: [
    (m) => `Okreval si se dobro, a nekateri kazalniki te še vlečejo nazaj — **${pct(m.battery!)}** danes.`,
    (m) => `Zmerna pripravljenost danes (**${pct(m.battery!)}**) — telo je nekje vmes.`,
    (m) => `Danes je zgodba bolj o ravnovesju kot o vrhunskem dnevu — **${pct(m.battery!)}** pripravljenosti.`,
  ],
  recoveryLow: [
    (m) => `Telo danes kliče po počitku — pripravljenost je na **${pct(m.battery!)}**.`,
    (m) => `Nizka pripravljenost danes (**${pct(m.battery!)}**) — največja zgodba ni obremenitev, ampak regeneracija.`,
    (m) => `Danes se telo bolj brani kot polni — **${pct(m.battery!)}**.`,
  ],
  trendImproving: [
    () => "Regeneracija se dviguje po lažji obremenitvi včeraj.",
    () => "Trend gre navzgor — zadnji dnevi se poznajo.",
  ],
  trendDeclining: [
    () => "Največja zgodba danes ni obremenitev — je doslednost.",
    () => "Regeneracija zadnje dni rahlo pada — vredno je pogledati zakaj.",
  ],
};

// ── WHY — paragraph 2, the explanation ──────────────────────────────────
export const WHY: Record<string, Tpl[]> = {
  sleepLow: [
    (m) => `Spanec ostaja glavni omejevalni dejavnik — le **${hrs(m.sleepH!)}** to noč.`,
    (m) => `Z **${hrs(m.sleepH!)}** spanca telo ni imelo dovolj časa za polno regeneracijo.`,
  ],
  sleepDebtHigh: [
    (m) => `K temu se je nabral tudi spalni dolg — **${Math.round(m.sleepDebtMin!)} min** manjka do cilja ta teden.`,
  ],
  sleepGood: [
    (m) => `**${hrs(m.sleepH!)}** spanca je bilo dovolj — dosledno spanje se obrestuje.`,
  ],
  recoveryAboveAvg: [
    (m) => `Regeneracijski del kazalnikov je nad tvojim običajnim nivojem (**${pct(m.recoveryScore!)}**) — živčni sistem je okrevan.`,
  ],
  recoveryBelowAvg: [
    (m) => `Regeneracijski del kazalnikov je pod tvojim običajnim nivojem (**${pct(m.recoveryScore!)}**) — znak preostale utrujenosti.`,
  ],
  stressHigh: [
    () => "Stres/razpoloženje danes vlečeta navzdol — psihična obremenitev šteje enako kot fizična.",
  ],
  sorenessHigh: [
    () => "Mišična napetost je še vedno prisotna od zadnjega treninga.",
  ],
  neutral: [
    (m) => `Kazalniki so danes blizu tvojega nedavnega povprečja (**${pct(m.battery!)}**).`,
  ],
};

// ── ACTIVITY — paragraph 3, today's training/strain ─────────────────────
export const ACTIVITY: Record<string, Tpl[]> = {
  strainAboveTarget: [
    (m) => `Današnja obremenitev (**${one(m.strain!)}**) je nad tvojim običajnim ciljem — telo je delalo.`,
  ],
  strainBelowTarget: [
    (m) => `Obremenitev danes (**${one(m.strain!)}**) je bila pod tvojim običajnim ciljem — lažji dan.`,
  ],
  strainNeutral: [
    (m) => `Obremenitev danes (**${one(m.strain!)}**) je bila v skladu s pričakovanji.`,
  ],
  workoutLoggedToday: [
    () => "Trening je danes zabeležen — to se pozna v jutrišnjih številkah.",
  ],
  noStrainData: [
    () => "Za obremenitev danes še ni podatka.",
  ],
};

// ── RECOMMENDATION — paragraph 4, the action ─────────────────────────────
export const RECOMMENDATION: Record<string, Tpl[]> = {
  recoveryLow: [
    () => "Danes je priložnost za pravo regeneracijo — lažji dan bo poplačan jutri.",
    () => "Razmisli o dnevu za okrevanje namesto polnega treninga.",
  ],
  sleepLow: [
    () => "Nekoliko zgodnejši spanec bi imel danes največji učinek.",
    () => "Pojdi malo prej spat — to je najhitrejša pot nazaj.",
  ],
  hydrationLow: [
    () => "Pred jutrišnjim dnem poskrbi za več tekočine.",
  ],
  strainAboveTarget: [
    () => "Po tako zahtevnem dnevu si telo zasluži lažji jutrišnji dan.",
  ],
  strainBelowTarget: [
    () => "Prostor je za nekoliko več — telo bi zdržalo zahtevnejši trening.",
  ],
  recoveryHigh: [
    () => "Sistem priporoča poln trening — telo je pripravljeno.",
    () => "Dober dan za to, da stopnjuješ.",
  ],
  neutral: [
    () => "Zmeren napor danes je razumna izbira.",
    () => "Prisluhni telesu in prilagodi intenzivnost sproti.",
  ],
};

// ── QUESTION — closing, conversational ───────────────────────────────────
export const QUESTION: Record<string, Tpl[]> = {
  recoveryHigh: [
    () => "Načrtuješ še en trening danes?",
    () => "Se čutiš dovolj okrevanega za zahteven trening jutri?",
  ],
  recoveryLow: [
    () => "Boš danes dal prednost počitku?",
    () => "Misliš, da boš danes v posteljo pred polnočjo?",
  ],
  neutral: [
    () => "Želiš jutri stopnjevati ali se osredotočiti na regeneracijo?",
    () => "Kako se telo počuti v primerjavi z včeraj?",
  ],
  noData: [
    () => "Kako se počutiš danes?",
  ],
};
