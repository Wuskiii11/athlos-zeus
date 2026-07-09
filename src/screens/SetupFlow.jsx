import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useTheme } from "../theme";
import { Mono, PrimaryBtn, LanguageSwitcher } from "../components/UI";
import { useLang, useT } from "../lib/i18n";
import { SPORTS } from "./ScreenProfile";
import WheelColumn from "../components/WheelPicker";
import RulerSlider from "../components/RulerSlider";
import { isNameTaken } from "../lib/api";
import { IcChart } from "../components/Icons";

// Single green accent everywhere — the design system's brand signal.

// ── BMI gauge — semicircle dial with a needle, recomputed live ──
function BmiGauge({ height, weight, C, t }) {
  const bmi = weight / Math.pow(height / 100, 2);
  const p = Math.max(0, Math.min(1, (bmi - 15) / (40 - 15)));
  const r = 78, cx = 100, cy = 96;
  const semi = Math.PI * r;
  const ang = Math.PI * (1 - p);
  const nx = cx + Math.cos(ang) * (r - 16);
  const ny = cy - Math.sin(ang) * (r - 16);
  const dark = C.name === "dark";
  return (
    <div style={{ position: "relative", margin: "4px auto 0", maxWidth: 290, width: "100%" }}>
      <svg viewBox="0 0 200 104" width="100%" style={{ display: "block" }}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={dark ? "rgba(255,255,255,0.12)" : "rgba(28,24,20,0.10)"} strokeWidth="10" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.text} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={semi} strokeDashoffset={semi * (1 - p)} style={{ transition: "stroke-dashoffset 0.2s ease" }} />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={C.text} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "all 0.2s ease" }} />
      </svg>
      {/* center readout + end labels */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "38%", textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontFamily: C.display, fontWeight: 500, fontSize: 12, color: C.muted }}>{t("Tvoj ITM")}</div>
        <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 30, color: C.text, lineHeight: 1.15 }}>{(Math.round(bmi * 10) / 10).toFixed(1)}</div>
      </div>
      <span style={{ position: "absolute", left: -4, bottom: -14, fontFamily: C.mono, fontSize: 8.5, color: C.muted2, letterSpacing: "0.04em" }}>{t("PODHRANJENOST")}</span>
      <span style={{ position: "absolute", right: -4, bottom: -14, fontFamily: C.mono, fontSize: 8.5, color: C.muted2, letterSpacing: "0.04em" }}>{t("DEBELOST")}</span>
    </div>
  );
}

const MONTHS_SL_SHORT = ["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"];
const MONTHS_EN_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const MONTHS_SL_FULL = ["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"];
const MONTHS_EN_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// A birth date is accepted only if it's a REAL calendar date in a sane range
// (1940 … min-age 10). The picker can't produce anything else, but this also
// guards restored localStorage state and any future input path — 42. 25. 1001
// can never reach the profile.
function validBirth(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  // JS rolls invalid dates over (32. 1. → 1. 2.) — reject anything that moved
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
  const max = new Date();
  max.setFullYear(max.getFullYear() - 10);
  return y >= 1940 && dt <= max;
}

// ── Typeform-style flow per spec §01: one step per screen, big "Naprej",
// optional steps can be skipped, progress persists locally so closing the
// app resumes from the last step. ──
const FLOW = ["name", "acq", "vision", "birth", "gender", "body", "waist", "quote", "sport", "goals", "exp", "injuries", "equipment", "test"];

const ACQ_OPTIONS = ["Instagram", "Prijatelj / soigralec", "Google", "TikTok", "Trener / klub", "Drugo"];
const GOAL_OPTIONS = ["Moč", "Mišična masa", "Eksplozivnost", "Hitrost", "Vzdržljivost", "Izguba maščobe", "Preventiva poškodb", "Splošna kondicija"];
const EXP_OPTIONS = ["0–1 let", "1–3 let", "3–5 let", "5+ let"];
const INJURY_OPTIONS = ["Koleno", "Gleženj", "Rama", "Hrbet", "Kolk", "Hamstring", "Zapestje"];
const EQUIPMENT_OPTIONS = ["Fitnes klub", "Domače uteži / ročke", "Drog za zgibe", "Elastike", "Samo lastna teža"];

const SETUP_KEY = "athlos:setup";
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SETUP_KEY) || "{}"); } catch { return {}; } };

// ── Inline birth-date wheels — no tap-to-open sheet: the three columns sit
// right on the step, with one full-width accent bar across the selected row
// (month | day | year), like a boarding-pass row. ──
function BirthWheelInline({ value, onChange, C, lang }) {
  const months = lang === "en" ? MONTHS_EN_FULL : MONTHS_SL_FULL;
  const maxD = new Date();
  maxD.setFullYear(maxD.getFullYear() - 10); // min age 10
  const init = value && validBirth(value) ? new Date(value) : new Date(2005, 5, 15);

  const startY = 1940;
  const endY = maxD.getFullYear();
  const years = Array.from({ length: endY - startY + 1 }, (_, i) => startY + i);
  const monthIdxs = Array.from({ length: 12 }, (_, i) => i);

  const [day, setDay] = useState(init.getDate());
  const [month, setMonth] = useState(init.getMonth());
  const [year, setYear] = useState(Math.min(init.getFullYear(), endY));

  const dim = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  // clamp to real dates and to the min-age ceiling
  useEffect(() => { if (day > dim) setDay(dim); }, [dim]); // eslint-disable-line
  useEffect(() => { if (year === endY && month > maxD.getMonth()) setMonth(maxD.getMonth()); }, [year]); // eslint-disable-line
  useEffect(() => { if (year === endY && month === maxD.getMonth() && day > maxD.getDate()) setDay(maxD.getDate()); }, [year, month]); // eslint-disable-line

  useEffect(() => {
    onChange(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }, [day, month, year]); // eslint-disable-line

  const onBar = C.btnText; // text sitting on the green selection bar

  return (
    <div style={{ position: "relative", margin: "6px -28px 0" }}>
      {/* full-width selection bar behind the middle row (7-row window → row 4) */}
      <div aria-hidden="true" style={{ position: "absolute", top: 120, left: 0, right: 0, height: 40, background: C.accent, zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", padding: "0 26px" }}>
        <WheelColumn items={monthIdxs} value={month} onChange={setMonth} width="46%" C={C} render={(m) => months[m]} align="left" showBand={false} activeColor={onBar} pad={3} />
        <WheelColumn items={days} value={day} onChange={setDay} width="18%" C={C} align="center" showBand={false} activeColor={onBar} pad={3} />
        <WheelColumn items={years} value={year} onChange={setYear} width="36%" C={C} align="right" showBand={false} activeColor={onBar} pad={3} />
      </div>
    </div>
  );
}

// GSAP drives the onboarding motion; a single guard keeps it off for
// users who asked the OS for reduced motion.
const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// tactile pop on the option the user just picked
const popPick = (el) => {
  if (!reduceMotion && el) gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.35, ease: "back.out(2.5)", clearProps: "transform" });
};

export default function SetupFlow({ profile, setProfile, onDone, onBack }) {
  const C = useTheme();
  const saved = useRef(loadSaved()).current;
  const [step, setStep] = useState(() => Math.min(saved.step || 0, FLOW.length - 1));
  const [username, setUsername] = useState(saved.username || "");
  const [nameMsg, setNameMsg] = useState("");
  const [checkingName, setCheckingName] = useState(false);
  const [acquisition, setAcquisition] = useState(saved.acquisition || "");
  const [birth, setBirth] = useState(validBirth(saved.birth) ? saved.birth : "");
  const [gender, setGender] = useState(saved.gender || "");
  const [height, setHeight] = useState(saved.height || 175);
  const [weight, setWeight] = useState(saved.weight || 70);
  const [waist, setWaist] = useState(saved.waist || "");
  const [bodyFat, setBodyFat] = useState(saved.bodyFat || "");
  const [sport, setSport] = useState(saved.sport || "");
  const [customSport, setCustomSport] = useState(saved.customSport || "");
  const [goals, setGoals] = useState(saved.goals || []);
  const [customGoal, setCustomGoal] = useState(saved.customGoal || "");
  const [experience, setExperience] = useState(saved.experience || "");
  const [injuries, setInjuries] = useState(saved.injuries || []);
  const [injuryNote, setInjuryNote] = useState(saved.injuryNote || "");
  const [equipment, setEquipment] = useState(saved.equipment || []);
  const scrollRef = useRef(null);
  const rootRef = useRef(null);
  const t = useT();
  const lang = useLang();
  const curLang = profile?.lang === "en" ? "en" : "sl";

  // Persist every answer + the current step so the flow resumes where the
  // user left off (spec §01, "predlog za interakcijo").
  useEffect(() => {
    try {
      localStorage.setItem(SETUP_KEY, JSON.stringify({
        step, username, acquisition, birth, gender, height, weight, waist, bodyFat,
        sport, customSport, goals, customGoal, experience, injuries, injuryNote, equipment,
      }));
    } catch {}
  }, [step, username, acquisition, birth, gender, height, weight, waist, bodyFat, sport, customSport, goals, customGoal, experience, injuries, injuryNote, equipment]);

  // Reset scroll to top on every step change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  // GSAP step entrance — the step's building blocks (kicker, title, fields,
  // buttons; individual options inside data-gsap-list containers) slide up
  // with a stagger, Typeform-style.
  useEffect(() => {
    if (reduceMotion) return;
    const el = scrollRef.current;
    if (!el) return;
    const targets = [];
    const walk = (node) => {
      for (const kid of Array.from(node.children)) {
        if (kid.hasAttribute("data-gsap-list")) targets.push(...Array.from(kid.children));
        else if (kid.querySelector?.("[data-gsap-list]")) walk(kid);
        else targets.push(kid);
      }
    };
    walk(el);
    if (!targets.length) return;
    const tween = gsap.fromTo(targets,
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: "power3.out", stagger: { each: 0.05 }, clearProps: "transform,opacity" });
    return () => tween.kill();
  }, [step]);

  // Slow ambient drift — background orbs and any [data-float] decorations
  // (hero figure, callouts) breathe up and down. sine.inOut, never bouncy.
  useEffect(() => {
    if (reduceMotion) return;
    const scope = rootRef.current;
    if (!scope) return;
    const els = scope.querySelectorAll("[data-float]");
    const tweens = Array.from(els).map((el, i) =>
      gsap.to(el, {
        y: i % 2 ? 8 : -8,
        duration: 3.6 + (i % 3) * 0.9,
        ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.35,
      })
    );
    return () => tweens.forEach((tw) => tw.kill());
  }, [step]);

  // Quote step — the gold progress line draws itself across the chart
  const quotePathRef = useRef(null);
  useEffect(() => {
    if (reduceMotion || FLOW[step] !== "quote") return;
    const p = quotePathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const tween = gsap.fromTo(p,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut", delay: 0.25 });
    return () => tween.kill();
  }, [step]);

  const total = FLOW.length;
  const key = FLOW[step];
  // Steps leave the stage before the next one enters: a short fade+lift out,
  // then the remount plays the staggered entrance. power2.in, 220 ms.
  const animStep = (target) => {
    if (target === step) return;
    if (reduceMotion || !scrollRef.current) { setStep(target); return; }
    gsap.to(scrollRef.current, {
      opacity: 0, y: -14, duration: 0.22, ease: "power2.in",
      onComplete: () => setStep(target),
    });
  };
  const next = () => animStep(Math.min(step + 1, total - 1));
  const back = () => animStep(Math.max(step - 1, 0));

  // Progress dashes count QUESTIONS only — the interstitial story screens
  // (vision, quote) show no indicator at all.
  const QUESTION_FLOW = FLOW.filter((k) => k !== "vision" && k !== "quote");
  const qIndex = QUESTION_FLOW.indexOf(key);

  // Display names are unique across accounts — check with the server before
  // moving on (offline/demo mode skips silently, isNameTaken returns false).
  const tryName = async () => {
    const n = username.trim();
    if (!n || checkingName) return;
    setCheckingName(true);
    const taken = await isNameTaken(n).catch(() => false);
    setCheckingName(false);
    if (taken) { setNameMsg("To ime je že zasedeno — izberi drugo."); return; }
    setNameMsg("");
    next();
  };
  const finish = () => {
    const finalSport = sport === "Drugo" ? (customSport.trim() || "Drugo") : sport;
    const finalGoals = [...goals, ...(customGoal.trim() ? [customGoal.trim()] : [])];
    try { localStorage.removeItem(SETUP_KEY); } catch {}
    onDone({
      username: username.trim() || "Športnik", birth, height, weight, sport: finalSport,
      acquisition, gender, waist: waist ? +waist : null, bodyFat: bodyFat ? +bodyFat : null,
      goals: finalGoals, experience, injuries, injuryNote: injuryNote.trim(), equipment,
    });
  };

  const inp = {
    width: "100%", padding: "15px 16px", borderRadius: 16,
    border: `1px solid ${C.border}`, background: C.surface2,
    color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 17,
    outline: "none", boxSizing: "border-box", marginTop: 8, colorScheme: "dark",
  };

  const STEP_TITLES = {
    name:      { title: "Uporabniško\nime",        sub: "KAKO TE BOMO KLICALI" },
    acq:       { title: "Kako si\nslišal za nas?", sub: "" },
    birth:     { title: "Datum\nrojstva",          sub: "" },
    gender:    { title: "Spol",                    sub: "ZA IZRAČUN NORM IN KALORIJ" },
    vision:    { title: "",                        sub: "" }, // custom render — hero figure with callouts
    body:      { title: "Višina\n& teža",          sub: "ZA IZRAČUN BREMEN IN KALORIJ" },
    waist:     { title: "Obseg pasu\n& body fat",  sub: "ČE VEŠ — DRUGAČE PRESKOČI" },
    quote:     { title: "",                        sub: "" }, // custom render
    sport:     { title: "Kateri šport\ntreniraš?", sub: "ZA PERSONALIZACIJO PROGRAMA" },
    goals:     { title: "Kaj je tvoj cilj?",       sub: "IZBERI ENEGA ALI VEČ" },
    exp:       { title: "Koliko let\nizkušenj imaš?", sub: "S FITNESOM / TRENINGOM MOČI" },
    injuries:  { title: "Poškodbe?",               sub: "TRENUTNE IN PRETEKLE — ZA VARNO PROGRAMIRANJE" },
    equipment: { title: "Kakšno opremo\nimaš na voljo?", sub: "PROGRAM SE PRILAGODI OPREMI" },
    test:      { title: "Začetni\ntest",           sub: "ZADNJI KORAK" },
  };

  // single-choice list — one marble tablet, rows split by engraved rules,
  // each option catalogued with a roman numeral; picking fills the bronze
  // socket (design-system list language instead of stacked boxes)
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const Choice = ({ options, value, onPick, subs, labels, icons }) => (
    <div data-gsap-list="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((o, i) => {
        const active = value === o;
        return (
          <button key={o} onClick={(e) => { popPick(e.currentTarget); onPick(o); }} style={{
            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
            padding: "16px 16px", borderRadius: 18, cursor: "pointer",
            background: active ? `${C.accent}14` : C.surface2,
            border: `1.5px solid ${active ? C.accent : "transparent"}`,
            boxShadow: "none",
            transition: "background 0.15s, border-color 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}>
            {icons?.[i] && (
              <span style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: C.surface3,
                border: `1px solid ${active ? C.accent : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: active ? C.accent : C.text2, transition: "color 0.15s, border-color 0.15s",
              }}>
                {icons[i]}
              </span>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: C.display, fontWeight: active ? 700 : 600, fontSize: 17.5, color: C.text }}>{labels ? labels[i] : o}</span>
              {subs?.[i] && <span style={{ display: "block", fontFamily: C.mono, fontSize: 10, color: C.muted, marginTop: 3 }}>{subs[i]}</span>}
            </span>
            {/* roman numeral, right — grey until the box is picked */}
            <span style={{ flexShrink: 0, minWidth: 28, textAlign: "right", fontFamily: C.mono, fontSize: active ? 13.5 : 11, fontWeight: active ? 700 : 600, letterSpacing: "0.06em", color: active ? C.accent : C.muted2, transition: "color 0.15s, font-size 0.15s" }}>
              {ROMAN[i]}
            </span>
          </button>
        );
      })}
    </div>
  );

  // multi-select chips
  const MultiChips = ({ options, values, onToggle }) => (
    <div data-gsap-list="true" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button key={o} onClick={(e) => { popPick(e.currentTarget); onToggle(o); }} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "12px 20px", borderRadius: 999, cursor: "pointer",
            border: `1.5px solid ${active ? `${C.accent}99` : C.border2}`,
            background: active ? `${C.accent}14` : "transparent",
            color: active ? C.text : C.text2,
            fontFamily: C.display, fontWeight: active ? 700 : 500, fontSize: 17.5,
            transition: "border-color 0.15s, background 0.15s, color 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}>
            {/* selection shows via colour only (no check). The label reserves its
                bold width so switching 500→700 never widens the pill or reflows. */}
            <span className="at-chip-lbl" data-text={o}>{o}</span>
          </button>
        );
      })}
    </div>
  );

  const toggle = (setter) => (o) => setter((arr) => arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);

  const SkipBtn = ({ onClick }) => (
    <button onClick={onClick} style={{ width: "100%", marginTop: 10, padding: "12px", background: "none", border: "none", color: C.muted, fontFamily: C.display, fontWeight: 600, fontSize: 14.5, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
      {t("Preskoči")} ›
    </button>
  );

  return (
    <div ref={rootRef} className="app-fullscreen" style={{
      // top+bottom so it fills the whole phone shell (no empty strip at the
      // bottom on mobile, where 100dvh can be shorter than the shell)
      position: "fixed", inset: 0,
      // matte canvas — calm, no gradients or glows
      background: C.bg,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>

      {/* top spacer */}
      <div style={{ height: 8, flexShrink: 0 }} />
      <LanguageSwitcher
        value={curLang}
        onChange={(lang) => setProfile((p) => ({ ...p, lang }))}
        variant="compact"
        style={{ position: "absolute", top: "max(env(safe-area-inset-top, 12px), 12px)", right: 20, zIndex: 3 }}
      />

      {/* Top row — just the back arrow; progress lives as dashes at the bottom */}
      <div style={{ padding: "12px 112px 0 24px", display: "flex", alignItems: "center" }}>
        {/* Back — earlier step, or out to the login screen on step 0 */}
        <button onClick={() => (step > 0 ? back() : onBack?.())} style={{ background: "none", border: "none", color: C.muted, fontSize: 24.5, cursor: "pointer", lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}>‹</button>
      </div>

      {/* Step content */}
      <div ref={scrollRef} key={step} style={{ flex: 1, padding: "28px 28px 38px", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" }}>
        {key !== "quote" && key !== "vision" && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 30, textTransform: "uppercase", margin: 0, color: C.text, lineHeight: 1.05, letterSpacing: "-0.01em", whiteSpace: "pre-line" }}>
              {t(STEP_TITLES[key].title)}
            </h2>
          </div>
        )}

        {key === "name" && (
          <>
            <Mono style={{ color: C.muted, fontSize: 10 }}>{t("UPORABNIŠKO IME")}</Mono>
            <input value={username} onChange={(e) => { setUsername(e.target.value); setNameMsg(""); }} onKeyDown={(e) => e.key === "Enter" && tryName()} placeholder={t("npr. Nik")} style={{ ...inp, ...(nameMsg ? { borderColor: C.red } : {}) }} />
            {nameMsg && <span style={{ color: C.red, fontFamily: C.display, fontSize: 13.5, marginTop: 6, display: "block" }}>{t(nameMsg)}</span>}

            {/* live preview — the profile row teammates will actually see */}
            <div style={{ marginTop: 22, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: `${C.accent}1a`, border: `1.5px solid ${C.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontWeight: 800, fontSize: 19, color: C.accent, flexShrink: 0, transition: "border-color 0.2s" }}>
                {(username.trim()[0] || "?").toUpperCase()}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: C.display, fontWeight: 700, fontSize: 17, color: username.trim() ? C.text : C.muted2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {username.trim() || t("Tvoje ime")}
                </span>
                <span style={{ display: "block", fontFamily: C.display, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{t("Tako te bodo videli soigralci in trener")}</span>
              </span>
            </div>

            {/* what the name is for — quiet rows so the step doesn't feel empty */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                ["M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z|dot", "Vidno v klepetu, na lestvicah in pri trenerju."],
                ["M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z", "Ime lahko kadarkoli spremeniš v Profilu."],
                ["M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z", "Vsako ime je unikatno — preverimo ga ob nadaljevanju."],
              ].map(([p, txt]) => {
                const [d, extra] = p.split("|");
                return (
                  <span key={txt} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d={d} />
                      {extra === "dot" && <circle cx="12" cy="12" r="3" />}
                    </svg>
                    <span style={{ fontFamily: C.display, fontWeight: 500, fontSize: 13.5, color: C.text2, lineHeight: 1.45 }}>{t(txt)}</span>
                  </span>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={tryName} style={{ opacity: username.trim() && !checkingName ? 1 : 0.5 }}>{checkingName ? t("Preverjam…") : t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "acq" && (
          <>
            <Choice
              options={ACQ_OPTIONS.map(t)}
              value={t(acquisition)}
              onPick={(o) => { setAcquisition(o); }}
              icons={[
                /* Instagram — brand gradient */
                <svg key="ig" width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="athlos-ig-grad" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#FFD600" /><stop offset="0.3" stopColor="#FF7A00" /><stop offset="0.55" stopColor="#FF0069" /><stop offset="0.8" stopColor="#D300C5" /><stop offset="1" stopColor="#7638FA" />
                    </linearGradient>
                  </defs>
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="url(#athlos-ig-grad)" strokeWidth="1.9" />
                  <circle cx="12" cy="12" r="4.2" stroke="url(#athlos-ig-grad)" strokeWidth="1.9" />
                  <circle cx="17.4" cy="6.6" r="1.35" fill="url(#athlos-ig-grad)" />
                </svg>,
                /* Prijatelj / soigralec — two people, sky blue */
                <svg key="fr" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#4FA8FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
                /* Google — brand G */
                <svg key="go" width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>,
                /* TikTok — layered brand cyan/red under the note */
                <svg key="tt" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M16.6 5.82A4.28 4.28 0 0115.55 3h-3.09v12.4a2.59 2.59 0 11-2.59-2.59c.27 0 .53.04.77.12V9.77a5.76 5.76 0 00-.77-.05 5.68 5.68 0 105.68 5.68V9.01a7.3 7.3 0 004.27 1.36V7.28a4.28 4.28 0 01-3.22-1.46z" fill="#25F4EE" transform="translate(-0.9,-0.55)" />
                  <path d="M16.6 5.82A4.28 4.28 0 0115.55 3h-3.09v12.4a2.59 2.59 0 11-2.59-2.59c.27 0 .53.04.77.12V9.77a5.76 5.76 0 00-.77-.05 5.68 5.68 0 105.68 5.68V9.01a7.3 7.3 0 004.27 1.36V7.28a4.28 4.28 0 01-3.22-1.46z" fill="#FE2C55" transform="translate(0.9,0.55)" />
                  <path d="M16.6 5.82A4.28 4.28 0 0115.55 3h-3.09v12.4a2.59 2.59 0 11-2.59-2.59c.27 0 .53.04.77.12V9.77a5.76 5.76 0 00-.77-.05 5.68 5.68 0 105.68 5.68V9.01a7.3 7.3 0 004.27 1.36V7.28a4.28 4.28 0 01-3.22-1.46z" fill={C.name === "dark" ? "#FFFFFF" : "#111111"} />
                </svg>,
                /* Trener / klub — shield in laurel green */
                <svg key="tk" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2FBF71" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9.5 12l1.8 1.8 3.2-3.6" /></svg>,
                /* Drugo — dots, violet */
                <svg key="dr" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="8" cy="12" r="0.9" fill="#A78BFA" stroke="none" /><circle cx="12" cy="12" r="0.9" fill="#A78BFA" stroke="none" /><circle cx="16" cy="12" r="0.9" fill="#A78BFA" stroke="none" /></svg>,
              ]}
            />
            <div style={{ flex: 1, minHeight: 16 }} />
            <PrimaryBtn onClick={() => acquisition && next()} style={{ opacity: acquisition ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
            <SkipBtn onClick={next} />
          </>
        )}

        {/* ── Vision step — welcome interstitial: headline, the three signals
            ATHLOS tracks as clean metric rows, and the CTA. No artwork. ── */}
        {key === "vision" && (
          <div data-gsap-list="true" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 29, color: C.text, margin: "4px 0 0", lineHeight: 1.15, letterSpacing: "-0.01em", textAlign: "center" }}>
              {t("Dobrodošel v svojo")}<br />
              <span style={{ color: C.accent }}>{t("najboljšo sezono")}</span>
            </h2>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, margin: "24px 0 8px" }}>
              {[t("READINESS 8.4"), t("MOČ +12 %"), t("REGENERACIJA 92 %")].map((lbl, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: C.surface2, borderRadius: 18, padding: "18px 20px" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
                  <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text, letterSpacing: "0.01em" }}>{lbl}</span>
                </div>
              ))}
            </div>

            <p style={{ fontFamily: C.display, fontWeight: 500, fontSize: 14, color: C.muted, textAlign: "center", margin: "0 8px 16px", lineHeight: 1.55 }}>
              {t("ATHLOS spremlja tvojo moč, hitrost in regeneracijo — in program prilagaja vsak dan.")}
            </p>
            <PrimaryBtn onClick={next}>{t("Naprej")} →</PrimaryBtn>
          </div>
        )}

        {key === "birth" && (
          <>
            <BirthWheelInline value={birth} onChange={setBirth} C={C} lang={lang} />
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => validBirth(birth) && next()} style={{ opacity: validBirth(birth) ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "gender" && (() => {
          const card = (active) => ({
            borderRadius: 24, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
            background: active ? `${C.accent}14` : C.surface2,
            border: `1.5px solid ${active ? C.accent : "transparent"}`,
            boxShadow: "none",
            transition: "background 0.15s, border-color 0.15s",
            WebkitTapHighlightColor: "transparent",
          });
          const sign = (d, active) => (
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={active ? C.accent : C.text} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.15s" }}>
              {d}
            </svg>
          );
          return (
            <>
              <div data-gsap-list="true" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* two tall cards — Mars / Venus, like the reference */}
                <button onClick={(e) => { popPick(e.currentTarget); setGender("Moški"); }} style={{ ...card(gender === "Moški"), flex: 1, minHeight: 150 }}>
                  {sign(<><circle cx="10" cy="14" r="5.5" /><path d="M14 10l6.5-6.5M20.5 3.5H15M20.5 3.5V9" /></>, gender === "Moški")}
                  <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>{t("Moški")}</span>
                </button>
                <button onClick={(e) => { popPick(e.currentTarget); setGender("Ženski"); }} style={{ ...card(gender === "Ženski"), flex: 1, minHeight: 150 }}>
                  {sign(<><circle cx="12" cy="8.5" r="5.5" /><path d="M12 14v7M8.5 17.5h7" /></>, gender === "Ženski")}
                  <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>{t("Ženski")}</span>
                </button>
                {/* Drugo — slim row under the two cards */}
                <button onClick={(e) => { popPick(e.currentTarget); setGender("Drugo"); }} style={{ ...card(gender === "Drugo"), flexDirection: "row", gap: 8, padding: "15px 16px" }}>
                  <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{t("Drugo")}</span>
                </button>
              </div>
              <PrimaryBtn onClick={() => gender && next()} style={{ marginTop: 14, opacity: gender ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
            </>
          );
        })()}

        {key === "body" && (
          <>
            <RulerSlider label={t("Izberi višino (cm)")} min={130} max={220} value={height} onChange={setHeight} C={C} />
            <RulerSlider label={t("Izberi težo (kg)")} min={40} max={150} value={weight} onChange={setWeight} C={C} />
            <BmiGauge height={height} weight={weight} C={C} t={t} />
            <div style={{ flex: 1, minHeight: 20 }} />
            <PrimaryBtn onClick={next}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "waist" && (() => {
          // realistic ranges only — no 1111111111111 (like the height/weight guards)
          const clean = (v) => {
            let s = v.replace(/[^\d.,]/g, "").replace(",", ".").slice(0, 5);
            const parts = s.split(".");
            if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
            return s;
          };
          const waistOk = waist === "" || (+waist >= 40 && +waist <= 200);
          const bfOk = bodyFat === "" || (+bodyFat >= 3 && +bodyFat <= 60);
          const canNext = (waist !== "" || bodyFat !== "") && waistOk && bfOk;
          const hint = { color: C.red, fontFamily: C.display, fontSize: 13.5, marginTop: 6, display: "block" };
          return (
          <>
            <Mono style={{ color: C.muted, fontSize: 10 }}>{t("OBSEG PASU (CM)")}</Mono>
            <input value={waist} onChange={(e) => setWaist(clean(e.target.value))} inputMode="decimal" placeholder={t("npr. 82")}
              style={{ ...inp, borderColor: waistOk ? C.border2 : C.red }} />
            {!waistOk && <span style={hint}>{t("Vnesi realen obseg pasu (40–200 cm).")}</span>}
            <Mono style={{ color: C.muted, fontSize: 10, marginTop: 18, display: "block" }}>{t("BODY FAT % (OKVIRNO)")}</Mono>
            <input value={bodyFat} onChange={(e) => setBodyFat(clean(e.target.value))} inputMode="decimal" placeholder={t("npr. 15")}
              style={{ ...inp, borderColor: bfOk ? C.border2 : C.red }} />
            {!bfOk && <span style={hint}>{t("Vnesi realen odstotek (3–60 %).")}</span>}
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => canNext && next()} style={{ opacity: canNext ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
            <SkipBtn onClick={() => { setWaist(""); setBodyFat(""); next(); }} />
          </>
          );
        })()}

        {/* ── Quote step ── */}
        {key === "quote" && (
          <div data-gsap-list="true" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Animated progress line */}
            <div style={{ marginBottom: 32 }}>
              <svg viewBox="0 0 300 80" width="100%" height="80" style={{ overflow: "visible" }}>
                {[20, 40, 60].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke={C.border} strokeWidth="1" strokeDasharray="4 6"/>)}
                <path ref={quotePathRef} d="M0 15 C30 15, 50 55, 80 45 S130 20, 160 35 S210 55, 240 40 S280 25, 300 30" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="0" y1="65" x2="300" y2="65" stroke={C.accent} strokeWidth="1.5" strokeDasharray="6 5" strokeOpacity="0.4"/>
                <circle cx="0" cy="15" r="5" fill={C.accent}/>
                <text x="2" y="76" fill={C.muted} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{t("DANES")}</text>
                <text x="240" y="76" fill={C.muted} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{t("6 MES.")}</text>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <Mono style={{ color: C.accent, fontSize: 10, letterSpacing: "0.18em" }}>{t("RESNICA JE:")}</Mono>
              <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 31.5, color: C.text, margin: "10px 0 0", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
                {t("Vsak vrhunski športnik je začel točno tam, kjer si ti zdaj.")}
              </h2>
              <p style={{ fontFamily: C.display, fontWeight: 500, fontSize: 15.5, color: C.text2, marginTop: 16, lineHeight: 1.6 }}>
                {t("ATHLOS te bo vodil skozi vzpone in padce — tako da boš dosegel cilj, ki si si ga zadal.")}
              </p>
              <p style={{ fontFamily: C.display, fontStyle: "italic", fontSize: 14.5, color: C.muted, marginTop: 20, lineHeight: 1.55 }}>
                {t("P.S. Najtežji del je že za teboj — odločitev, da začneš.")}
              </p>
            </div>

            <PrimaryBtn onClick={next} style={{ marginTop: 16 }}>{t("Naprej")} →</PrimaryBtn>
          </div>
        )}

        {key === "sport" && (
          <div style={{ paddingBottom: 90 }}>
            {/* same engraved tablet as the other choice steps */}
            <Choice options={SPORTS} labels={SPORTS.map(t)} value={sport} onPick={setSport} />

            {sport === "Drugo" && (
              <div style={{ animation: "athlosFade 0.2s ease", marginTop: 14 }}>
                <Mono style={{ color: C.muted, fontSize: 10 }}>{t("VPIŠI ŠPORT")}</Mono>
                <input value={customSport} onChange={(e) => setCustomSport(e.target.value)} placeholder={t("npr. Odbojka, Judo, Veslanje...")} style={{ ...inp, marginTop: 6 }} />
              </div>
            )}
          </div>
        )}

        {key === "goals" && (
          <>
            <MultiChips options={GOAL_OPTIONS.map(t)} values={goals} onToggle={toggle(setGoals)} />
            <div style={{ marginTop: 16 }}>
              <Mono style={{ color: C.muted, fontSize: 10 }}>{t("DRUGO (PO ŽELJI)")}</Mono>
              <input value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} placeholder={t("npr. priprava na maraton")} style={{ ...inp, marginTop: 6 }} />
            </div>
            <div style={{ flex: 1, minHeight: 16 }} />
            <PrimaryBtn onClick={() => (goals.length || customGoal.trim()) && next()} style={{ opacity: goals.length || customGoal.trim() ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "exp" && (
          <>
            <Choice options={EXP_OPTIONS} value={experience} onPick={setExperience} />
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => experience && next()} style={{ opacity: experience ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "injuries" && (
          <>
            <MultiChips options={INJURY_OPTIONS.map(t)} values={injuries} onToggle={toggle(setInjuries)} />
            <div style={{ marginTop: 16 }}>
              <Mono style={{ color: C.muted, fontSize: 10 }}>{t("DETAJLI (PO ŽELJI)")}</Mono>
              <textarea value={injuryNote} onChange={(e) => setInjuryNote(e.target.value)} rows={3} placeholder={t("npr. operacija ACL 2024, občasna bolečina v rami…")} style={{ ...inp, resize: "none", fontSize: 15.5 }} />
            </div>
            <div style={{ flex: 1, minHeight: 16 }} />
            <PrimaryBtn onClick={next} style={{ opacity: injuries.length || injuryNote.trim() ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
            <SkipBtn onClick={() => { setInjuries([]); setInjuryNote(""); next(); }} />
          </>
        )}

        {key === "equipment" && (
          <>
            <MultiChips options={EQUIPMENT_OPTIONS.map(t)} values={equipment} onToggle={toggle(setEquipment)} />
            <div style={{ flex: 1, minHeight: 16 }} />
            <PrimaryBtn onClick={() => equipment.length && next()} style={{ opacity: equipment.length ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
            <SkipBtn onClick={() => { setEquipment([]); next(); }} />
          </>
        )}

        {key === "test" && (
          <>
            {/* Placeholder — spec §01: assessment content is TBD */}
            <div style={{ background: C.surface, border: `1.5px dashed ${C.border2}`, borderRadius: 18, padding: "26px 20px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: C.accent }}><IcChart size={32} /></div>
              <h3 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 8px" }}>{t("Začetni assessment")}</h3>
              <p style={{ fontFamily: C.display, fontSize: 14.5, color: C.text2, margin: 0, lineHeight: 1.55 }}>
                {t("Kratek test moči, hitrosti in mobilnosti — vsebina prihaja kmalu. Zaenkrat ta korak preskočimo.")}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={finish}>{t("Začni")}</PrimaryBtn>
          </>
        )}

      </div>

      {/* Progress dashes — one per QUESTION, bottom center; interstitial
          story screens (vision, quote) render none */}
      {qIndex !== -1 && (
        <div style={{
          position: "absolute", left: 0, right: 0,
          bottom: "max(env(safe-area-inset-bottom, 4px), 4px)",
          display: "flex", gap: 6, padding: "0 16px",
          zIndex: 4,
        }}>
          {QUESTION_FLOW.map((k, i) => {
            const reached = i <= qIndex; // only already-visited questions are jumpable
            return (
              <button key={k} onClick={() => reached && animStep(FLOW.indexOf(k))}
                aria-label={`${t("Vprašanje")} ${i + 1}`}
                style={{
                  flex: i === qIndex ? 2.4 : 1, height: 16, padding: 0,
                  border: "none", background: "transparent",
                  display: "flex", alignItems: "center",
                  cursor: reached ? "pointer" : "default",
                  transition: "flex 0.3s ease",
                  WebkitTapHighlightColor: "transparent",
                }}>
                <span style={{
                  width: "100%", height: 4, borderRadius: 999,
                  background: reached ? C.accent : C.surface3,
                  transition: "background 0.3s ease",
                }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Fixed bottom button for the sport step — lifted above the dashes */}
      {key === "sport" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "12px 28px",
          paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 28px), 30px)",
          background: `linear-gradient(to top, ${C.bg} 70%, transparent)`,
        }}>
          <PrimaryBtn
            onClick={() => sport && (sport !== "Drugo" || customSport.trim()) && next()}
            style={{ opacity: sport && (sport !== "Drugo" || customSport.trim()) ? 1 : 0.4 }}
          >
            {t("Nadaljuj")}
          </PrimaryBtn>
        </div>
      )}

    </div>
  );
}
