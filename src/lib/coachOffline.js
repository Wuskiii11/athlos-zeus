// ─────────────────────────────────────────────────────────────
// ZEUS — memory-aware OFFLINE coach.
//
// Used in demo mode (no Supabase / no AI key) so the agent still visibly
// "knows" the athlete: it reads the learning memory (goal / level / season /
// equipment / injuries / last feedback) and answers from it — including a real
// weekly plan on request. When the live edge function is deployed it takes over;
// this is the graceful fallback so the app feels intelligent out of the box.
// ─────────────────────────────────────────────────────────────

const norm = (s) => String(s || "").toLowerCase();

// Small exercise bank, each tagged with the body areas it stresses (for injury-aware swaps).
const POOL = {
  // Exercise names are always English (industry-standard gym vocabulary,
  // shown regardless of the SL/EN UI toggle) — only surrounding chrome
  // (labels, session/day names) follows the language switch.
  lowerStrength: [
    { n: "Squat", area: ["Koleno"] },
    { n: "Romanian deadlift", area: ["Spodnji hrbet"] },
    { n: "Bulgarian split squat", area: ["Koleno"] },
    { n: "Nordic hamstring curl", area: [] },
    { n: "Hip thrust", area: [] },
  ],
  upperStrength: [
    { n: "Bench press", area: ["Rama"] },
    { n: "Barbell row", area: ["Spodnji hrbet"] },
    { n: "Overhead press", area: ["Rama"] },
    { n: "Pull-ups", area: ["Komolec"] },
    { n: "Face pull", area: [] },
  ],
  power: [
    { n: "Box jump", area: ["Koleno", "Gleženj"] },
    { n: "Medicine ball slam", area: [] },
    { n: "Hang power clean", area: ["Spodnji hrbet"] },
    { n: "Broad jump", area: ["Koleno"] },
  ],
  speed: [
    { n: "Flying sprint 20m", area: [] },
    { n: "Accelerations 30m", area: [] },
    { n: "A-skip / B-skip", area: [] },
    { n: "Hill sprint", area: [] },
  ],
  conditioning: [
    { n: "Rower 4×400m", area: [] },
    { n: "Kettlebell swings", area: ["Spodnji hrbet"] },
    { n: "Bike intervals 6×1 min", area: [] },
    { n: "Sled push", area: [] },
  ],
  core: [
    { n: "Plank", area: ["Spodnji hrbet"] },
    { n: "Dead bug", area: [] },
    { n: "Pallof press", area: [] },
    { n: "Side plank", area: [] },
  ],
  mobility: [
    { n: "90/90 hip switch", area: [] },
    { n: "Cat-cow", area: [] },
    { n: "Hip flexor stretch", area: [] },
    { n: "Shoulder mobility (stick)", area: [] },
  ],
};

// sets×reps tuned to level
function dose(level, kind) {
  const l = norm(level);
  const profi = l.includes("profi") || l.includes("tekmoval");
  if (kind === "strength") return profi ? "5×5" : "3×8";
  if (kind === "power") return profi ? "5×3" : "3×4";
  if (kind === "speed") return profi ? "6×30 m" : "4×30 m";
  if (kind === "cond") return profi ? "5 krogov" : "3 krogi";
  return profi ? "3×12" : "3×10";
}

// goal → ordered session blueprints (name + which pools + dose-kind)
function blueprintFor(goal) {
  const g = norm(goal);
  if (g.includes("hitrost") || g.includes("eksploz"))
    return [
      { name: "Hitrost & moč", blocks: [["speed", "speed"], ["power", "power"], ["core", "core"]] },
      { name: "Spodnji del (moč)", blocks: [["lowerStrength", "strength"], ["core", "core"]] },
      { name: "Zgornji del + eksplozija", blocks: [["upperStrength", "strength"], ["power", "power"]] },
      { name: "Kondicija", blocks: [["conditioning", "cond"], ["core", "core"]] },
    ];
  if (g.includes("vzdrž"))
    return [
      { name: "Kondicija (interval)", blocks: [["conditioning", "cond"], ["core", "core"]] },
      { name: "Celo telo (moč-vzdrž.)", blocks: [["lowerStrength", "strength"], ["upperStrength", "strength"]] },
      { name: "Tempo & jedro", blocks: [["speed", "speed"], ["core", "core"]] },
      { name: "Lahka kondicija", blocks: [["conditioning", "cond"], ["mobility", "mob"]] },
    ];
  if (g.includes("rehab"))
    return [
      { name: "Mobilnost & jedro", blocks: [["mobility", "mob"], ["core", "core"]] },
      { name: "Lahka moč (kontrolirano)", blocks: [["lowerStrength", "strength"], ["core", "core"]] },
      { name: "Mobilnost & stabilnost", blocks: [["mobility", "mob"], ["core", "core"]] },
    ];
  // Moč / Splošna pripravljenost (default)
  return [
    { name: "Spodnji del (moč)", blocks: [["lowerStrength", "strength"], ["core", "core"]] },
    { name: "Zgornji del (moč)", blocks: [["upperStrength", "strength"], ["core", "core"]] },
    { name: "Celo telo + eksplozija", blocks: [["power", "power"], ["lowerStrength", "strength"]] },
    { name: "Kondicija & jedro", blocks: [["conditioning", "cond"], ["core", "core"]] },
  ];
}

const DAY_LABELS = ["PON", "TOR", "SRE", "ČET", "PET", "SOB", "NED"];
// spread N training days across the week
function trainingDayIndexes(n) {
  if (n <= 3) return [0, 2, 4].slice(0, n);
  if (n === 4) return [0, 1, 3, 4];
  if (n === 5) return [0, 1, 2, 4, 5];
  return [0, 1, 2, 3, 4, 5];
}

// All areas to avoid = funnel injuries + body areas the athlete reported pain in recently.
// This is the "learning" made visible: report knee pain once → plans stop loading the knee.
function allInjuries(memory) {
  const s = (memory && memory.setup) || {};
  const fbPain = ((memory && memory.feedback) || []).slice(-3).flatMap((f) => f.pain || []);
  return [...new Set([...(s.injuries || []), ...fbPain])];
}

function pick(poolKey, injuries, count) {
  const inj = (injuries || []).map(norm);
  const safe = POOL[poolKey].filter((e) => !e.area.some((a) => inj.includes(norm(a))));
  const list = safe.length ? safe : POOL[poolKey]; // if all unsafe, fall back (rare)
  return list.slice(0, count);
}

export function weeklyPlan(memory) {
  const s = (memory && memory.setup) || {};
  const days = Math.max(2, Math.min(6, Number(s.daysPerWeek) || 3));
  const bp = blueprintFor(s.goal);
  const injuries = allInjuries(memory);
  const idxs = trainingDayIndexes(days);

  const lines = [];
  idxs.forEach((dayIdx, i) => {
    const session = bp[i % bp.length];
    const exs = [];
    session.blocks.forEach(([poolKey, kind]) => {
      pick(poolKey, injuries, 2).forEach((e) => {
        const k = kind === "strength" ? "strength" : kind === "power" ? "power" : kind === "speed" ? "speed" : kind === "cond" ? "cond" : "core";
        exs.push(`${e.n} ${dose(s.level, k)}`);
      });
    });
    lines.push(`${DAY_LABELS[dayIdx]} — ${session.name}: ${exs.slice(0, 4).join(", ")}.`);
  });
  return lines;
}

// Structured sessions for the Calendar: [{ dayIndex (0=Mon..6=Sun), title }] from memory.
// Deterministic (goal + days), so saving to the calendar never depends on parsing AI text.
export function planSessions(memory) {
  const s = (memory && memory.setup) || {};
  const days = Math.max(2, Math.min(6, Number(s.daysPerWeek) || 3));
  const bp = blueprintFor(s.goal);
  return trainingDayIndexes(days).map((dayIndex, i) => ({ dayIndex, title: bp[i % bp.length].name }));
}

// Last feedback → a one-line progression / caution note.
function progressionNote(memory) {
  const fb = (memory && memory.feedback) || [];
  const last = fb[fb.length - 1];
  if (!last) return "Po prvem tednu mi javi RPE in morebitno bolečino — naslednji teden prilagodim obremenitev.";
  const bits = [];
  if (last.pain && last.pain.length) bits.push(`zadnjič te je pikalo: ${last.pain.join(", ")} — te vaje sem prilagodil`);
  if (last.rpe != null) {
    if (last.rpe >= 9) bits.push("ker je bil RPE visok, sem malenkost znižal obseg");
    else if (last.rpe <= 5) bits.push("ker je bil RPE nizek, lahko stopnjujeva — +2,5 kg na glavnih dvigih");
    else bits.push("obremenitev ohranjam, +2,5 kg na glavnih dvigih ko gre vse čisto");
  }
  return bits.length ? bits.join("; ") + "." : "Naslednji teden +2,5 kg na glavnih dvigih, če zaključiš vse serije čisto.";
}

function knows(memory, profile) {
  const s = (memory && memory.setup) || {};
  const p = [];
  if (s.goal) p.push(`cilj ${s.goal}`);
  if (s.level) p.push(`nivo ${s.level}`);
  if (s.seasonPhase) p.push(s.seasonPhase);
  if (profile?.sport) p.push(profile.sport.toLowerCase());
  return p.join(" · ");
}

// Main entry: a memory-aware reply. Returns a string.
export function offlineCoachReply(question, memory, profile) {
  const q = norm(question);
  const s = (memory && memory.setup) || {};
  const inj = allInjuries(memory);

  // ── plan / training request ──
  if (/(trening|plan|teden|program|vad|sestav|naredi mi)/.test(q)) {
    const lead = `Tvoj teden${knows(memory, profile) ? ` (${knows(memory, profile)})` : ""}:`;
    const plan = weeklyPlan(memory);
    const equip = (s.equipment || []).length ? ` Opremo upoštevam: ${s.equipment.join(", ")}.` : "";
    return `${lead}\n${plan.map((l) => "• " + l).join("\n")}\n${progressionNote(memory)}${equip}`;
  }

  // ── pain ──
  if (/(bol|koleno|rama|hrbet|gleženj|poškod|pika|teži)/.test(q)) {
    const known = inj.length ? ` Vem, da imaš težave s: ${inj.join(", ")} — te vaje že zaobidem.` : "";
    return `Oceni bolečino 1–10.${known} Pri 3–4 zamenjam problematične vaje z varnejšimi (npr. počep → most za zadnjico), pri 7+ priporočam premor in fizioterapevta.`;
  }

  // ── nutrition ──
  if (/(prehran|kalor|jed|hran|beljakov|protein|teža)/.test(q)) {
    const w = profile?.weight;
    const goalTxt = s.goal ? ` za cilj ${s.goal}` : "";
    const prot = w ? ` Cilj beljakovin: ~${Math.round(w * 1.8)} g/dan.` : "";
    return `Prehrano prilagodim tvoji teži in fazi${goalTxt}.${prot} Povej mi, kdaj danes treniraš, in razporedim obroke okoli treninga.`;
  }

  // ── recovery ──
  if (/(regener|recovery|spanj|utruj|počitek|hrv)/.test(q)) {
    return `Pri ${s.level || "tvojem"} nivoju in ${s.daysPerWeek || 3} treningih na teden je ključen vsaj 1 popoln počitek + 7–9 h spanja. Če si tri dni utrujen, vstavim lahek regeneracijski dan.`;
  }

  // ── why / how / general ──
  const k = knows(memory, profile);
  if (k) return `Poznam te (${k}). Vprašaj me za teden treninga, prilagoditev vaje, prehrano ali regeneracijo — odgovor naslonim na tvoje podatke.`;
  return "Povej mi cilj in šport, pa ti sestavim trening. Lahko me vprašaš tudi o bolečini, prehrani ali regeneraciji.";
}
