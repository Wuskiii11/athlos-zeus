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

export default function SetupFlow({ profile, setProfile, onDone }) {
  const C = useTheme();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [birth, setBirth] = useState("");
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [sport, setSport] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [sportQuery, setSportQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef(null);
  const t = useT();
  const lang = useLang();
  const curLang = profile?.lang === "en" ? "en" : "sl";

  // Reset scroll to top on every step change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  const total = 5; // 0:name 1:birth 2:height/weight 3:quote 4:sport
  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => {
    const finalSport = sport === "Drugo" ? (customSport.trim() || "Drugo") : sport;
    onDone({ username: username.trim() || "Športnik", birth, height, weight, sport: finalSport });
  };

  const inp = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: `1px solid ${C.border2}`, background: C.surface,
    color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 15,
    outline: "none", boxSizing: "border-box", marginTop: 8, colorScheme: "dark",
  };
  // Wheel pickers only ever offer values inside the realistic range, so
  // height/weight are always valid once a step renders.
  const heightOk = true;
  const weightOk = true;

  const STEP_TITLES = [
    { title: "Uporabniško\nime",  sub: "KAKO TE BOMO KLICALI" },
    { title: "Datum\nrojstva",    sub: "ZA PRILAGODITEV PROGRAMA" },
    { title: "Višina\n& teža",    sub: "ZA IZRAČUN BREMEN IN KALORIJ" },
    { title: "",                  sub: "" }, // quote step — custom render
    { title: "Kateri šport\ntreniraš?", sub: "ZA PERSONALIZACIJO PROGRAMA" },
  ];

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
        style={{ position: "absolute", top: "max(env(safe-area-inset-top, 12px), 12px)", right: 20, zIndex: 3 }}
      />

      {/* Progress bar */}
      <div style={{ padding: "10px 132px 0 24px", display: "flex", alignItems: "center", gap: 10 }}>
        {step > 0 && (
          <button onClick={back} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}>‹</button>
        )}
        <div style={{ flex: 1, height: 3, borderRadius: 999, background: C.surface3, overflow: "hidden" }}>
          <div style={{ width: `${((step + 1) / total) * 100}%`, height: "100%", background: C.accent, borderRadius: 999, transition: "width 0.35s cubic-bezier(.2,.8,.2,1)" }} />
        </div>
        <Mono style={{ color: C.muted, fontSize: 9 }}>{step + 1}/{total}</Mono>
      </div>

      {/* Step content */}
      <div ref={scrollRef} key={step} style={{ flex: 1, padding: "28px 28px 24px", display: "flex", flexDirection: "column", animation: "athlosScreen 0.28s cubic-bezier(.2,.8,.2,1)", overflowY: "auto", scrollbarWidth: "none" }}>
        {step !== 3 && (
          <div style={{ marginBottom: 28 }}>
            <Mono style={{ color: C.accent, fontSize: 9 }}>{t(STEP_TITLES[step].sub)}</Mono>
            <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 30, textTransform: "uppercase", margin: "8px 0 0", color: C.text, lineHeight: 1.05, letterSpacing: "-0.01em", whiteSpace: "pre-line" }}>
              {t(STEP_TITLES[step].title)}
            </h2>
          </div>
        )}

        {step === 0 && (
          <>
            <Mono style={{ color: C.muted, fontSize: 9 }}>{t("UPORABNIŠKO IME")}</Mono>
            <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && username.trim() && next()} placeholder={t("npr. Nik")} style={inp} />
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => username.trim() && next()} style={{ opacity: username.trim() ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {step === 1 && (
          <>
            <Mono style={{ color: C.muted, fontSize: 9 }}>{t("DATUM ROJSTVA")}</Mono>
            {/* Custom date button */}
            <button
              onClick={() => setPickerOpen(true)}
              style={{
                width: "100%", marginTop: 8, padding: "16px 18px",
                borderRadius: 12,
                border: `1px solid ${birth ? C.accent : C.border2}`,
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={birth ? C.accent : C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2"/>
                <path d="M3 9h18M8 2v4M16 2v4"/>
              </svg>
            </button>
            <div style={{ flex: 1 }} />
            <PrimaryBtn onClick={() => birth && next()} style={{ opacity: birth ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {step === 2 && (
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
            <PrimaryBtn onClick={() => heightOk && weightOk && next()} style={{ opacity: heightOk && weightOk ? 1 : 0.5 }}>{t("Nadaljuj")}</PrimaryBtn>
          </>
        )}

        {/* ── Quote step ── */}
        {step === 3 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", animation: "athlosScreen 0.3s cubic-bezier(.2,.8,.2,1)" }}>
            {/* Animated progress line */}
            <div style={{ marginBottom: 32 }}>
              <svg viewBox="0 0 300 80" width="100%" height="80" style={{ overflow: "visible" }}>
                {/* Grid lines */}
                {[20, 40, 60].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke={C.border} strokeWidth="1" strokeDasharray="4 6"/>)}
                {/* Main curve — downward trend with wobble */}
                <path d="M0 15 C30 15, 50 55, 80 45 S130 20, 160 35 S210 55, 240 40 S280 25, 300 30" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
                {/* Dashed target line */}
                <line x1="0" y1="65" x2="300" y2="65" stroke={C.accent} strokeWidth="1.5" strokeDasharray="6 5" strokeOpacity="0.4"/>
                {/* Start dot */}
                <circle cx="0" cy="15" r="5" fill={C.accent}/>
                {/* Labels */}
                <text x="2" y="76" fill={C.muted} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{t("DANES")}</text>
                <text x="240" y="76" fill={C.muted} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{t("6 MES.")}</text>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <Mono style={{ color: C.accent, fontSize: 9 }}>{t("RESNICA JE:")}</Mono>
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

        {step === 4 && (
          <>
            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={sportQuery}
                onChange={(e) => setSportQuery(e.target.value)}
                placeholder={t("Iskanje šport...")}
                style={{ ...inp, marginTop: 0, paddingLeft: 40, fontSize: 14 }}
              />
              {sportQuery && (
                <button onClick={() => setSportQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
              )}
            </div>

            {/* Sport chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start", paddingBottom: 80 }}>
              {SPORTS.filter(s => s.toLowerCase().includes(sportQuery.toLowerCase())).map((s) => {
                const active = sport === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSport(s)}
                    style={{
                      padding: "9px 16px", borderRadius: 999, cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                      fontFamily: C.display, fontWeight: active ? 700 : 500, fontSize: 13,
                      border: `1.5px solid ${active ? C.accent : C.border2}`,
                      background: active ? `${C.accent}22` : "transparent",
                      color: active ? C.accent : C.text2,
                      transition: "border-color 0.15s, background 0.15s, color 0.15s",
                    }}
                  >
                    {active && <span style={{ marginRight: 6, fontSize: 11 }}>✓</span>}
                    {s}
                  </button>
                );
              })}
              {SPORTS.filter(s => s.toLowerCase().includes(sportQuery.toLowerCase())).length === 0 && (
                <div style={{ color: C.muted, fontFamily: C.display, fontSize: 13, padding: "12px 0" }}>{t("Ni rezultatov za")} "{sportQuery}"</div>
              )}
            </div>

            {sport === "Drugo" && (
              <div style={{ animation: "athlosFade 0.2s ease", marginTop: 12 }}>
                <Mono style={{ color: C.muted, fontSize: 9 }}>{t("VPIŠI ŠPORT")}</Mono>
                <input value={customSport} onChange={(e) => setCustomSport(e.target.value)} placeholder={t("npr. Odbojka, Judo, Veslanje...")} style={{ ...inp, marginTop: 6 }} />
              </div>
            )}
          </>
        )}

      </div>

      {/* Fixed bottom button for step 4 */}
      {step === 4 && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "12px 28px",
          paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)",
          background: `linear-gradient(to top, ${C.bg} 70%, transparent)`,
        }}>
          <PrimaryBtn
            onClick={() => sport && (sport !== "Drugo" || customSport.trim()) && finish()}
            style={{ opacity: sport && (sport !== "Drugo" || customSport.trim()) ? 1 : 0.4 }}
          >
            {t("Začni")}
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
