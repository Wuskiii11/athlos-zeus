import React, { useState } from "react";
import { useTheme } from "../theme";
import { Pressable, PrimaryBtn } from "../components/UI";
import { useT } from "../lib/i18n";

function calcTarget(goal) {
  let base = 2600;
  if (goal === "izguba") base -= 400;
  if (goal === "pridobitev") base += 400;
  return base;
}

function macroSplit(mass) {
  if (mass === "misice") return { p: 35, c: 45, f: 20 };
  if (mass === "mascoba") return { p: 25, c: 55, f: 20 };
  return { p: 30, c: 50, f: 20 };
}

function buildMealPlan(goal, mass) {
  const target = calcTarget(goal);
  const m = macroSplit(mass);
  const meals = [
    { name: "Zajtrk", pct: 0.25, desc: mass === "misice" ? "Ovsena kaša, jajca, skuta" : "Ovsena kaša, banana, oreščki" },
    { name: "Malica", pct: 0.15, desc: "Grški jogurt + banana + oreščki" },
    { name: "Kosilo", pct: 0.35, desc: mass === "misice" ? "Piščanec, riž, zelenjava" : "Losos, krompir, solata" },
    { name: "Po treningu", pct: 0.10, desc: "Proteinski shake + sadje" },
    { name: "Večerja", pct: 0.15, desc: "Puran/tofu, kvinoja, zelenjava" },
  ];
  return {
    target,
    macros: { p: Math.round((target * m.p / 100) / 4), c: Math.round((target * m.c / 100) / 4), f: Math.round((target * m.f / 100) / 9) },
    meals: meals.map((meal) => ({ ...meal, kcal: Math.round(target * meal.pct) })),
  };
}

const GOAL_LABEL = { izguba: "Izguba teže", vzdrzevanje: "Vzdrževanje", pridobitev: "Pridobitev teže" };
const MASS_LABEL = { mascoba: "Energija / volumen", misice: "Mišična masa" };

const MACRO_COLORS = { p: "#4ADE80", c: "#60A5FA", f: "#FBBF24" };

function MacroPie({ macros, eaten, target }) {
  const C = useTheme();
  const t = useT();
  const r = 42, sw = 9, cx = 52, cy = 52;
  const circ = 2 * Math.PI * r;

  const totalCal = macros.p * 4 + macros.c * 4 + macros.f * 9;
  const pLen = (macros.p * 4 / totalCal) * circ;
  const cLen = (macros.c * 4 / totalCal) * circ;
  const fLen = (macros.f * 9 / totalCal) * circ;
  const gap = 3;

  const pct = Math.min(100, Math.round((eaten / target) * 100));

  return (
    <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
      <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface3} strokeWidth={sw} />
        {/* Protein */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={MACRO_COLORS.p} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, pLen - gap)} ${circ - (pLen - gap)}`}
          strokeDashoffset={0}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)" }}
        />
        {/* Carbs */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={MACRO_COLORS.c} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, cLen - gap)} ${circ - (cLen - gap)}`}
          strokeDashoffset={-(pLen)}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)" }}
        />
        {/* Fat */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={MACRO_COLORS.f} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, fLen - gap)} ${circ - (fLen - gap)}`}
          strokeDashoffset={-(pLen + cLen)}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 20, color: C.text, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 10, color: C.muted, marginTop: 3 }}>{t("ZAUŽITO")}</span>
      </div>
    </div>
  );
}

function MacroMini({ label, v, color }) {
  const C = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 15.5, color: C.text, lineHeight: 1 }}>{v}<span style={{ fontSize: 10, color: C.muted }}>g</span></div>
        <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12.5, color: C.muted }}>{label}</span>
      </div>
    </div>
  );
}

function EatenForm({ onAdd }) {
  const C = useTheme();
  const t = useT();
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const submit = () => {
    const k = parseInt(kcal, 10);
    if (!name.trim() || !k || k <= 0) return;
    onAdd({ name: name.trim(), kcal: k });
    setName(""); setKcal("");
  };
  const inp = { padding: "13px 14px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 15.5, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder={t("npr. Sendvič")} style={{ ...inp, flex: 1 }} />
      <input value={kcal} onChange={(e) => setKcal(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="kcal" inputMode="numeric" style={{ ...inp, width: 70, textAlign: "center" }} />
      <Pressable onClick={submit} scale={0.9} style={{ width: 46, borderRadius: 14, border: "none", background: C.accent, color: "#ffffff", fontWeight: 800, fontSize: 24.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</Pressable>
    </div>
  );
}

export default function ScreenFuel() {
  const C = useTheme();
  const t = useT();
  const [goal, setGoal] = useState("vzdrzevanje");
  const [mass, setMass] = useState("misice");
  const [plan, setPlan] = useState(() => buildMealPlan("vzdrzevanje", "misice"));
  const [eaten, setEaten] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const eatenTotal = eaten.reduce((s, e) => s + e.kcal, 0);
  const remaining = Math.max(0, plan.target - eatenTotal);
  const pct = Math.min(100, Math.round((eatenTotal / plan.target) * 100));
  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setPlan(buildMealPlan(goal, mass));
      setShowSetup(false);
      setLoading(false);
    }, 900);
  };
  const label = { fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted, display: "block" };

  return (
    <div style={{ padding: "10px 18px 28px", color: C.text }}>
      <header style={{ marginBottom: 16 }}>
        <span style={label}>{t("HRANA")}</span>
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 28, margin: "4px 0 0", color: C.text, letterSpacing: "-0.02em" }}>{t("Tvoj jedilnik")}</h2>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, marginBottom: 14 }}>
        <MacroPie macros={plan.macros} eaten={eatenTotal} target={plan.target} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 29, color: C.text, lineHeight: 1, letterSpacing: "-0.02em" }}>{remaining}<span style={{ fontSize: 14.5, color: C.muted, fontWeight: 600 }}> kcal</span></div>
          <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13.5, color: C.muted, display: "block", marginTop: 4 }}>{t("ŠE NA VOLJO DANES")}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <MacroMini label={t("Proteini")} v={plan.macros.p} color={MACRO_COLORS.p} />
            <MacroMini label={t("Ogljikohidrati")} v={plan.macros.c} color={MACRO_COLORS.c} />
            <MacroMini label={t("Maščobe")} v={plan.macros.f} color={MACRO_COLORS.f} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Pressable onClick={() => setShowSetup((v) => !v)} scale={0.97} style={{ flex: 1, padding: "13px", borderRadius: 999, border: "none", background: showSetup ? C.btn : `${C.accent}1c`, color: showSetup ? C.btnText : C.accent, fontFamily: C.display, fontSize: 15.5, fontWeight: 700 }}>
          {t("AI Sestavi jedilnik")}
        </Pressable>
      </div>

      {showSetup && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, marginBottom: 14, animation: "athlosFade 0.2s ease" }}>
          <span style={label}>{t("CILJ")}</span>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
            {["izguba", "vzdrzevanje", "pridobitev"].map((g) => (
              <button key={g} onClick={() => setGoal(g)} style={{ flex: 1, padding: "10px 4px", borderRadius: 999, border: "none", background: goal === g ? C.accent : C.surface2, color: goal === g ? "#04130a" : C.muted, fontFamily: C.display, fontSize: 12.5, textTransform: "lowercase", cursor: "pointer", fontWeight: goal === g ? 700 : 500 }}>{t(GOAL_LABEL[g]).split(" ")[0]}</button>
            ))}
          </div>
          <span style={label}>{t("FOKUS")}</span>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
            {["mascoba", "misice"].map((mm) => (
              <button key={mm} onClick={() => setMass(mm)} style={{ flex: 1, padding: "10px 4px", borderRadius: 999, border: "none", background: mass === mm ? C.accent : C.surface2, color: mass === mm ? "#04130a" : C.muted, fontFamily: C.display, fontSize: 12.5, textTransform: "lowercase", cursor: "pointer", fontWeight: mass === mm ? 700 : 500 }}>{t(MASS_LABEL[mm])}</button>
            ))}
          </div>
          <PrimaryBtn onClick={generate}>{loading ? t("Sestavljam...") : t("Sestavi jedilnik")}</PrimaryBtn>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        <span style={{ padding: "7px 13px", borderRadius: 999, background: C.accent, color: "#ffffff", fontFamily: C.display, fontWeight: 800, fontSize: 13.5 }}>{t(GOAL_LABEL[goal])}</span>
        <span style={{ padding: "7px 13px", borderRadius: 999, background: C.surface2, border: `1px solid ${C.border}`, color: C.text2, fontFamily: C.display, fontWeight: 600, fontSize: 13.5 }}>{t(MASS_LABEL[mass])}</span>
        <span style={{ padding: "7px 13px", borderRadius: 999, background: C.surface2, border: `1px solid ${C.border}`, color: C.text2, fontFamily: C.display, fontWeight: 600, fontSize: 13.5 }}>{plan.target} KCAL</span>
      </div>

      <span style={{ ...label, marginBottom: 10 }}>{t("NAČRT OBROKOV")}</span>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 16px" }}>
        {plan.meals.map((meal, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < plan.meals.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 17, color: C.text }}>{t(meal.name)}</div>
              <div style={{ fontFamily: C.display, fontWeight: 400, fontSize: 14.5, color: C.text2, marginTop: 2 }}>{t(meal.desc)}</div>
            </div>
            <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: C.accent }}>{meal.kcal}<span style={{ fontSize: 11, color: C.muted }}> kcal</span></div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <span style={{ ...label, marginBottom: 4 }}>{t("KAJ SEM DANES POJEDEL")}</span>
        <EatenForm onAdd={(item) => setEaten((e) => [...e, { ...item, id: Date.now() }])} />
        {eaten.length === 0 && <span style={{ fontFamily: C.display, fontWeight: 400, fontSize: 14.5, color: C.muted2 }}>{t("Vpiši obrok zgoraj — kalorije se odštejejo avtomatsko.")}</span>}
        {eaten.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 16px" }}>
            {eaten.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{e.name}</div>
                <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.text2 }}>{e.kcal} kcal</div>
                <button onClick={() => setEaten((list) => list.filter((x) => x.id !== e.id))} style={{ background: "none", border: "none", color: C.muted2, fontSize: 18, cursor: "pointer", padding: 4 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", fontFamily: C.display, fontWeight: 800 }}>
              <span style={{ color: C.muted, fontFamily: C.display, fontSize: 14.5, fontWeight: 600 }}>{t("skupaj danes")}</span>
              <span style={{ color: C.accent, fontSize: 20 }}>{eatenTotal} kcal</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
