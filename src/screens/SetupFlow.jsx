import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../theme";
import { Mono, PrimaryBtn, LanguageSwitcher } from "../components/UI";
import { useLang, useT } from "../lib/i18n";
import { SPORTS } from "./ScreenProfile";
import DatePicker from "../components/DatePicker";
import WheelColumn from "../components/WheelPicker";

const HEIGHTS = Array.from({ length: 131 }, (_, i) => 100 + i); // 100–230 cm
const WEIGHTS = Array.from({ length: 221 }, (_, i) => 30 + i);  // 30–250 kg

const MONTHS_SL_SHORT = ["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"];
const MONTHS_EN_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
function fmtBirth(iso, lang) {
  const d = new Date(iso);
  const months = lang === "en" ? MONTHS_EN_SHORT : MONTHS_SL_SHORT;
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Typeform-style flow per spec §01: one step per screen, big "Naprej",
// optional steps can be skipped, progress persists locally so closing the
// app resumes from the last step. ──
const FLOW = ["name", "acq", "birth", "gender", "body", "waist", "quote", "sport", "goals", "exp", "injuries", "equipment", "test"];

const ACQ_OPTIONS = ["Instagram", "Prijatelj / soigralec", "Google", "TikTok", "Trener / klub", "Drugo"];
const GENDERS = ["Moški", "Ženski", "Drugo"];
const GOAL_OPTIONS = ["Moč", "Mišična masa", "Eksplozivnost", "Hitrost", "Vzdržljivost", "Izguba maščobe", "Preventiva poškodb", "Splošna kondicija"];
const EXP_OPTIONS = ["0–1 let", "1–3 let", "3–5 let", "5+ let"];
const INJURY_OPTIONS = ["Koleno", "Gleženj", "Rama", "Hrbet", "Kolk", "Hamstring", "Zapestje"];
const EQUIPMENT_OPTIONS = ["Fitnes klub", "Domače uteži / ročke", "Drog za zgibe", "Elastike", "Samo lastna teža"];

const SETUP_KEY = "athlos:setup";
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SETUP_KEY) || "{}"); } catch { return {}; } };

export default function SetupFlow({ profile, setProfile, onDone }) {
  const C = useTheme();
  const saved = useRef(loadSaved()).current;
  const [step, setStep] = useState(() => Math.min(saved.step || 0, FLOW.length - 1));
  const [username, setUsername] = useState(saved.username || "");
  const [acquisition, setAcquisition] = useState(saved.acquisition || "");
  const [birth, setBirth] = useState(saved.birth || "");
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef(null);
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

  const total = FLOW.length;
  const key = FLOW[step];
  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
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
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: `1px solid ${C.border2}`, background: C.surface,
    color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 15,
    outline: "none", boxSizing: "border-box", marginTop: 8, colorScheme: "dark",
  };

  const STEP_TITLES = {
    name:      { title: "Uporabniško\nime",        sub: "KAKO TE BOMO KLICALI" },
    acq:       { title: "Kako si\nslišal za nas?", sub: "DA VEMO, OD KOD PRIHAJAŠ" },
    birth:     { title: "Datum\nrojstva",          sub: "ZA PRILAGODITEV PROGRAMA" },
    gender:    { title: "Spol",                    sub: "ZA IZRAČUN NORM IN KALORIJ" },
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
  const hairline = C.name === "dark" ? "rgba(255,255,255,0.07)" : "rgba(28,24,20,0.08)";
  const Choice = ({ options, value, onPick, subs, labels }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((o, i) => {
        const active = value === o;
        return (
          <button key={o} onClick={() => onPick(o)} style={{
            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
            padding: "15px 16px", borderRadius: 16, cursor: "pointer",
            background: active
              ? `${C.gold}12`
              : (C.name === "dark" ? C.surface : "linear-gradient(170deg, #FCF9F2, #F3ECDD)"),
            border: `1.5px solid ${active ? `${C.gold}99` : (C.name === "dark" ? C.border : "#D8CFBD")}`,
            boxShadow: C.name === "dark" ? "none" : "0 3px 10px rgba(28,24,20,0.05)",
            transition: "background 0.15s, border-color 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: C.display, fontWeight: active ? 700 : 600, fontSize: 15.5, color: C.text }}>{labels ? labels[i] : o}</span>
              {subs?.[i] && <span style={{ display: "block", fontFamily: C.mono, fontSize: 9, color: C.muted, marginTop: 3 }}>{subs[i]}</span>}
            </span>
            {/* roman numeral, right — grey until the box is picked */}
            <span style={{ flexShrink: 0, minWidth: 28, textAlign: "right", fontFamily: C.mono, fontSize: active ? 12 : 10, fontWeight: active ? 700 : 600, letterSpacing: "0.06em", color: active ? C.gold : C.muted2, transition: "color 0.15s, font-size 0.15s" }}>
              {ROMAN[i]}
            </span>
          </button>
        );
      })}
    </div>
  );

  // multi-select chips
  const MultiChips = ({ options, values, onToggle }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} style={{
            padding: "10px 16px", borderRadius: 999, cursor: "pointer",
            border: `1.5px solid ${active ? `${C.gold}99` : C.border2}`,
            background: active ? `${C.gold}14` : "transparent",
            color: active ? C.text : C.text2,
            fontFamily: C.display, fontWeight: active ? 700 : 500, fontSize: 13,
            transition: "border-color 0.15s, background 0.15s, color 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}>
            {active && <span style={{ marginRight: 6, fontSize: 11, color: C.gold }}>✓</span>}{o}
          </button>
        );
      })}
    </div>
  );

  const toggle = (setter) => (o) => setter((arr) => arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);

  const SkipBtn = ({ onClick }) => (
    <button onClick={onClick} style={{ width: "100%", marginTop: 10, padding: "12px", background: "none", border: "none", color: C.muted, fontFamily: C.display, fontWeight: 600, fontSize: 13, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
      {t("Preskoči")} ›
    </button>
  );

  return (
    <div className="app-fullscreen" style={{
      position: "fixed", top: 0, left: 0, right: 0,
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

      {/* Progress bar — bronze, clear of the compact language pill */}
      <div style={{ padding: "12px 112px 0 24px", display: "flex", alignItems: "center", gap: 10 }}>
        {step > 0 && (
          <button onClick={back} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}>‹</button>
        )}
        <div style={{ flex: 1, height: 3, borderRadius: 999, background: C.surface3, overflow: "hidden" }}>
          <div style={{ width: `${((step + 1) / total) * 100}%`, height: "100%", background: C.gold, borderRadius: 999, transition: "width 0.35s cubic-bezier(.2,.8,.2,1)" }} />
        </div>
        <Mono style={{ color: C.muted, fontSize: 9 }}>{step + 1}/{total}</Mono>
      </div>

      {/* Step content */}
      <div ref={scrollRef} key={step} style={{ flex: 1, padding: "28px 28px 24px", display: "flex", flexDirection: "column", animation: "athlosScreen 0.28s cubic-bezier(.2,.8,.2,1)", overflowY: "auto", scrollbarWidth: "none" }}>
        {key !== "quote" && (
          <div style={{ marginBottom: 28 }}>
            <Mono style={{ color: C.gold, fontSize: 9, letterSpacing: "0.18em" }}>{t(STEP_TITLES[key].sub)}</Mono>
            <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 27, textTransform: "uppercase", margin: "8px 0 0", color: C.text, lineHeight: 1.05, letterSpacing: "-0.01em", whiteSpace: "pre-line" }}>
              {t(STEP_TITLES[key].title)}
            </h2>
          </div>
        )}

        {key === "name" && (
          <>
            <Mono style={{ color: C.muted, fontSize: 9 }}>{t("UPORABNIŠKO IME")}</Mono>
            <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && username.trim() && next()} placeholder={t("npr. Nik")} style={inp} />
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => username.trim() && next()} style={{ opacity: username.trim() ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "acq" && (
          <>
            <Choice options={ACQ_OPTIONS.map(t)} value={t(acquisition)} onPick={(o) => { setAcquisition(o); }} />
            <div style={{ flex: 1, minHeight: 16 }} />
            <PrimaryBtn onClick={() => acquisition && next()} style={{ opacity: acquisition ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
            <SkipBtn onClick={next} />
          </>
        )}

        {key === "birth" && (
          <>
            <Mono style={{ color: C.muted, fontSize: 9 }}>{t("DATUM ROJSTVA")}</Mono>
            <button
              onClick={() => setPickerOpen(true)}
              style={{
                width: "100%", marginTop: 8, padding: "16px 18px",
                borderRadius: 12,
                border: `1px solid ${birth ? `${C.gold}88` : C.border2}`,
                background: C.surface,
                color: birth ? C.text : C.muted,
                fontFamily: C.display, fontWeight: birth ? 700 : 500, fontSize: 16,
                textAlign: "left", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "border-color 0.2s, background 0.2s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span>{birth ? fmtBirth(birth, lang) : t("Izberi datum")}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={birth ? C.gold : C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2"/>
                <path d="M3 9h18M8 2v4M16 2v4"/>
              </svg>
            </button>
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => birth && next()} style={{ opacity: birth ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "gender" && (
          <>
            <Choice options={GENDERS.map(t)} value={t(gender)} onPick={setGender} />
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => gender && next()} style={{ opacity: gender ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {key === "body" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-around", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <Mono style={{ color: C.muted, fontSize: 9, display: "block", marginBottom: 8 }}>{t("VIŠINA (CM)")}</Mono>
                <WheelColumn items={HEIGHTS} value={height} onChange={setHeight} width={84} C={C} render={(h) => `${h} cm`} />
              </div>
              <div style={{ textAlign: "center" }}>
                <Mono style={{ color: C.muted, fontSize: 9, display: "block", marginBottom: 8 }}>{t("TEŽA (KG)")}</Mono>
                <WheelColumn items={WEIGHTS} value={weight} onChange={setWeight} width={84} C={C} render={(w) => `${w} kg`} />
              </div>
            </div>
            <div style={{ flex: 1 }} />
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
          const hint = { color: C.red, fontFamily: C.display, fontSize: 12, marginTop: 6, display: "block" };
          return (
          <>
            <Mono style={{ color: C.muted, fontSize: 9 }}>{t("OBSEG PASU (CM)")}</Mono>
            <input value={waist} onChange={(e) => setWaist(clean(e.target.value))} inputMode="decimal" placeholder={t("npr. 82")}
              style={{ ...inp, borderColor: waistOk ? C.border2 : C.red }} />
            {!waistOk && <span style={hint}>{t("Vnesi realen obseg pasu (40–200 cm).")}</span>}
            <Mono style={{ color: C.muted, fontSize: 9, marginTop: 18, display: "block" }}>{t("BODY FAT % (OKVIRNO)")}</Mono>
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", animation: "athlosScreen 0.3s cubic-bezier(.2,.8,.2,1)" }}>
            {/* Animated progress line */}
            <div style={{ marginBottom: 32 }}>
              <svg viewBox="0 0 300 80" width="100%" height="80" style={{ overflow: "visible" }}>
                {[20, 40, 60].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke={C.border} strokeWidth="1" strokeDasharray="4 6"/>)}
                <path d="M0 15 C30 15, 50 55, 80 45 S130 20, 160 35 S210 55, 240 40 S280 25, 300 30" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="0" y1="65" x2="300" y2="65" stroke={C.gold} strokeWidth="1.5" strokeDasharray="6 5" strokeOpacity="0.4"/>
                <circle cx="0" cy="15" r="5" fill={C.gold}/>
                <text x="2" y="76" fill={C.muted} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{t("DANES")}</text>
                <text x="240" y="76" fill={C.muted} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{t("6 MES.")}</text>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <Mono style={{ color: C.gold, fontSize: 9, letterSpacing: "0.18em" }}>{t("RESNICA JE:")}</Mono>
              <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 28, color: C.text, margin: "10px 0 0", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
                {t("Vsak vrhunski športnik je začel točno tam, kjer si ti zdaj.")}
              </h2>
              <p style={{ fontFamily: C.display, fontWeight: 500, fontSize: 14, color: C.text2, marginTop: 16, lineHeight: 1.6 }}>
                {t("ATHLOS te bo vodil skozi vzpone in padce — tako da boš dosegel cilj, ki si si ga zadal.")}
              </p>
              <p style={{ fontFamily: C.display, fontStyle: "italic", fontSize: 13, color: C.muted, marginTop: 20, lineHeight: 1.55 }}>
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
                <Mono style={{ color: C.muted, fontSize: 9 }}>{t("VPIŠI ŠPORT")}</Mono>
                <input value={customSport} onChange={(e) => setCustomSport(e.target.value)} placeholder={t("npr. Odbojka, Judo, Veslanje...")} style={{ ...inp, marginTop: 6 }} />
              </div>
            )}
          </div>
        )}

        {key === "goals" && (
          <>
            <MultiChips options={GOAL_OPTIONS.map(t)} values={goals} onToggle={toggle(setGoals)} />
            <div style={{ marginTop: 16 }}>
              <Mono style={{ color: C.muted, fontSize: 9 }}>{t("DRUGO (PO ŽELJI)")}</Mono>
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
              <Mono style={{ color: C.muted, fontSize: 9 }}>{t("DETAJLI (PO ŽELJI)")}</Mono>
              <textarea value={injuryNote} onChange={(e) => setInjuryNote(e.target.value)} rows={3} placeholder={t("npr. operacija ACL 2024, občasna bolečina v rami…")} style={{ ...inp, resize: "none", fontSize: 14 }} />
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
              <div style={{ fontSize: 34, marginBottom: 10 }}>📊</div>
              <h3 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: C.text, margin: "0 0 8px" }}>{t("Začetni assessment")}</h3>
              <p style={{ fontFamily: C.display, fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.55 }}>
                {t("Kratek test moči, hitrosti in mobilnosti — vsebina prihaja kmalu. Zaenkrat ta korak preskočimo.")}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={finish}>{t("Začni")}</PrimaryBtn>
          </>
        )}

      </div>

      {/* Fixed bottom button for the sport step */}
      {key === "sport" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "12px 28px",
          paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)",
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

      {/* DatePicker — rendered inside this phone shell (position:absolute, clipped by overflow:hidden) */}
      {pickerOpen && (
        <DatePicker
          value={birth}
          onChange={(v) => { setBirth(v); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
