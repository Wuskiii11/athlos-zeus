import React, { useState } from "react";
import { useTheme } from "../theme";
import { Pressable, SettingsBlock, BackBtn, Mono, LanguageSwitcher } from "../components/UI";
import { changePassword, requestPasswordReset, changeEmail, isNameTaken } from "../lib/api";
import { useT } from "../lib/i18n";

const PLANS = [
  {
    id: "basic",
    name: "BASIC",
    earlyBird: "€29",
    regular: "€49",
    color: "#60A5FA",
    features: [
      "AI program + jedilnik",
      "Zasebni sezonski koledar",
      "AI asistent 24/7",
      "Dnevni log + history",
      "Community (opcijsko)",
    ],
    notIncluded: ["Daily Performance Report","Biometrija Apple Health","Video analiza","Post-match recovery","Tedna AI analiza","Ekskluzivni content","Early access"],
  },
  {
    id: "pro",
    name: "PRO",
    earlyBird: "€59",
    regular: "€99",
    color: "#863bff",
    badge: "PRILJUBLJEN",
    features: [
      "AI program + jedilnik",
      "Zasebni sezonski koledar",
      "AI asistent 24/7",
      "Dnevni log + history",
      "Community (opcijsko)",
      "Daily Performance Report",
      "Biometrija Apple Health",
      "Video analiza · 10/mes",
      "Post-match recovery",
    ],
    notIncluded: ["Tedna AI analiza","Ekskluzivni content (Tim)","Early access novih funkcij"],
  },
  {
    id: "elite",
    name: "ELITE",
    earlyBird: "€89",
    regular: "€149",
    color: "#FFB800",
    badge: "OPCIJSKO",
    features: [
      "Vse iz PRO plana",
      "Tedna AI analiza napredka",
      "Ekskluzivni content (Tim)",
      "Early access novih funkcij",
      "Video analiza · Neomejeno",
      "Post-match recovery",
    ],
    notIncluded: [],
    note: "Elite je opcijsko — se potrjuje.",
  },
];

// Account identity + security — split out of the main Settings list so that
// list doesn't have to carry name/email/password/language/plan alongside
// theme/legal. Reached from Settings via the "Račun" row.
export default function ScreenAccount({ profile, setProfile, user, onBack }) {
  const C = useTheme();
  const t = useT();

  const curLang = profile.lang === "en" ? "en" : "sl";
  const setLang = (lang) => setProfile((p) => ({ ...p, lang }));

  // Push-notification permission (device-level, via the browser API)
  const [notifPerm, setNotifPerm] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) return Notification.permission;
    return "unsupported";
  });
  const toggleNotifs = async () => {
    if (!("Notification" in window) || notifPerm === "denied" || notifPerm === "granted") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const currentPlan = profile.plan || "basic";
  const [planOpen, setPlanOpen] = useState(false);

  const [name, setName] = useState(profile.name);
  const [editingName, setEditingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [email, setEmail] = useState(user?.email || "");
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  const [changingPw, setChangingPw] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const [resetMsg, setResetMsg] = useState("");
  const [resetting, setResetting] = useState(false);

  const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
  const inp = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 17, outline: "none", boxSizing: "border-box" };
  const editBtn = { padding: "9px 16px", borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.accent, fontFamily: C.display, fontSize: 14.5, fontWeight: 700 };
  const primaryBtn = { borderRadius: 999, border: "none", background: C.accent, color: "#ffffff", fontFamily: C.display, fontWeight: 800, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
  const outlineBtn = { borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
  const msgBox = (ok) => ({ padding: "11px 14px", borderRadius: 14, background: ok ? `${C.accent}14` : `${C.red}14`, border: `1px solid ${ok ? C.accent : C.red}40`, color: ok ? C.accent : C.red, fontFamily: C.display, fontSize: 14.5, marginTop: 10 });

  const saveName = async () => {
    const n = name.trim();
    if (!n) return;
    // Display names are unique across accounts (matches the DB unique index)
    if (n.toLowerCase() !== (profile.name || "").toLowerCase() && await isNameTaken(n).catch(() => false)) {
      setNameMsg("To ime je že zasedeno — izberi drugo.");
      return;
    }
    setNameMsg("");
    setProfile((p) => ({ ...p, name: n }));
    setEditingName(false);
  };

  const saveEmail = async () => {
    if (!email.includes("@")) { setEmailMsg("Vnesi veljaven e-naslov."); return; }
    try {
      await changeEmail(email.trim());
      setEmailMsg("✓ Poslali smo potrditveno povezavo na nov e-naslov.");
      setTimeout(() => { setEditingEmail(false); setEmailMsg(""); }, 2400);
    } catch (e) {
      setEmailMsg(e.message || "Napaka pri spremembi e-pošte.");
    }
  };

  const savePassword = async () => {
    if (!oldPw || !newPw) { setPwMsg("Izpolni oba polja."); return; }
    if (newPw.length < 6) { setPwMsg("Novo geslo mora imeti vsaj 6 znakov."); return; }
    try {
      await changePassword(oldPw, newPw);
      setPwMsg("✓ Geslo uspešno posodobljeno.");
      setTimeout(() => { setChangingPw(false); setOldPw(""); setNewPw(""); setPwMsg(""); }, 1800);
    } catch (e) {
      setPwMsg(e.message || "Napaka pri spremembi gesla.");
    }
  };

  const sendReset = async () => {
    if (!email) { setResetMsg("Ni e-naslova za ta račun."); return; }
    setResetting(true);
    try {
      await requestPasswordReset(email);
      setResetMsg("✓ Povezava za ponastavitev je bila poslana na e-naslov zgoraj.");
    } catch (e) {
      setResetMsg(e.message || "Napaka pri pošiljanju.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ padding: "10px 18px 28px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 22 }}>
        <BackBtn onClick={onBack} />
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 27, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>{t("Račun")}</h2>
      </header>

      {/* Username */}
      <SettingsBlock title={t("UPORABNIŠKO IME")}>
        {!editingName ? (
          <div style={row}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 17, color: C.text }}>{profile.name}</span>
            <Pressable onClick={() => { setName(profile.name); setEditingName(true); }} scale={0.95} style={editBtn}>{t("Uredi")}</Pressable>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={name} onChange={(e) => { setName(e.target.value); setNameMsg(""); }} onKeyDown={(e) => e.key === "Enter" && saveName()} style={{ flex: 1, padding: "13px 16px", borderRadius: 14, border: `1px solid ${nameMsg ? C.red : C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 17, outline: "none", boxSizing: "border-box" }} />
              <Pressable onClick={saveName} scale={0.93} style={{ ...primaryBtn, padding: "0 20px" }}>{t("Shrani")}</Pressable>
            </div>
            {nameMsg && <div style={msgBox(false)}>{t(nameMsg)}</div>}
          </>
        )}
      </SettingsBlock>

      {/* Email */}
      <SettingsBlock title={t("E-POŠTA")}>
        {!editingEmail ? (
          <div style={row}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 17, color: C.text }}>{email || t("Ni nastavljeno")}</span>
            <Pressable onClick={() => { setEmailMsg(""); setEditingEmail(true); }} scale={0.95} style={editBtn}>{t("Uredi")}</Pressable>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ime@email.com" style={inp} />
            {emailMsg && <div style={msgBox(emailMsg.startsWith("✓"))}>{t(emailMsg)}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              <button onClick={() => { setEditingEmail(false); setEmail(user?.email || ""); setEmailMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 14.5 }}>{t("Prekliči")}</button>
              <button onClick={saveEmail} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 14.5 }}>{t("Shrani")}</button>
            </div>
          </div>
        )}
      </SettingsBlock>

      {/* Password */}
      <SettingsBlock title={t("GESLO")}>
        {!changingPw ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={row}>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{t("Spremeni geslo")}</span>
              <Pressable onClick={() => setChangingPw(true)} scale={0.95} style={editBtn}>{t("Uredi")}</Pressable>
            </div>
            <div style={{ width: "100%", height: 1, background: C.border }} />
            <div style={row}>
              <div>
                <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text2 }}>{t("Pozabljeno geslo?")}</span>
                {email && <Mono style={{ display: "block", color: C.muted, fontSize: 10, marginTop: 3 }}>{email}</Mono>}
              </div>
              <Pressable onClick={sendReset} disabled={resetting} scale={0.95} style={{ ...editBtn, opacity: resetting ? 0.6 : 1 }}>{resetting ? t("Pošiljam…") : t("Ponastavi")}</Pressable>
            </div>
            {resetMsg && <div style={msgBox(resetMsg.startsWith("✓"))}>{t(resetMsg)}</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13.5, color: C.muted }}>{t("TRENUTNO GESLO")}</span>
            <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="••••••••" style={inp} />
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13.5, color: C.muted, marginTop: 8 }}>{t("NOVO GESLO")}</span>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" style={inp} />
            {pwMsg && <div style={msgBox(pwMsg.startsWith("✓"))}>{t(pwMsg)}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { setChangingPw(false); setOldPw(""); setNewPw(""); setPwMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 14.5 }}>{t("Prekliči")}</button>
              <button onClick={savePassword} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 14.5 }}>{t("Shrani geslo")}</button>
            </div>
          </div>
        )}
      </SettingsBlock>

      {/* Language */}
      <SettingsBlock title={t("JEZIK")}>
        <LanguageSwitcher value={curLang} onChange={setLang} />
      </SettingsBlock>

      {/* Notifications — moved here from Settings so the account screen owns
          everything personal (identity, security, language, notifications, plan) */}
      <SettingsBlock title={t("OBVESTILA")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{t("Potisna obvestila")}</span>
            <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, marginTop: 3 }}>
              {notifPerm === "granted"
                ? t("Vklopljeno")
                : notifPerm === "denied"
                ? t("Blokirano — dovoli v nastavitvah naprave")
                : notifPerm === "unsupported"
                ? t("Ni podprto v tem brskalniku")
                : t("Izklopljeno")}
            </div>
          </div>
          {notifPerm !== "unsupported" && (
            <button
              onClick={toggleNotifs}
              disabled={notifPerm === "denied"}
              style={{
                width: 50, height: 28, borderRadius: 999, flexShrink: 0,
                background: notifPerm === "granted" ? C.accent : C.surface2,
                border: `1px solid ${notifPerm === "granted" ? C.accent : C.border2}`,
                cursor: notifPerm === "denied" ? "not-allowed" : "pointer",
                position: "relative", transition: "background 0.22s", padding: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{
                position: "absolute", top: 3,
                left: notifPerm === "granted" ? 24 : 3,
                width: 22, height: 22, borderRadius: "50%",
                background: "#fff", transition: "left 0.22s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                display: "block",
              }} />
            </button>
          )}
        </div>
        {notifPerm === "denied" && (
          <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, marginTop: 10, padding: "10px 12px", borderRadius: 10, background: C.surface2, lineHeight: 1.5 }}>
            {t("Odpri nastavitve naprave → Aplikacije → Brskalnik → Obvestila in jih dovoli.")}
          </div>
        )}
      </SettingsBlock>

      {/* Plan — current plan only, tap to reveal its info */}
      <SettingsBlock title={t("MOJ PLAN")}>
        {(() => {
          const plan = PLANS.find((p) => p.id === currentPlan) || PLANS[0];
          return (
            <>
              <Pressable
                onClick={() => setPlanOpen((o) => !o)}
                scale={0.99}
                style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}
              >
                <div>
                  <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{t("Trenutni plan")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <span style={{ padding: "4px 12px", borderRadius: 999, background: `${plan.color}1a`, border: `1px solid ${plan.color}40` }}>
                      <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 12.5, letterSpacing: "0.04em", color: plan.color }}>{plan.name}</span>
                    </span>
                    <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted }}>{plan.earlyBird}{t("/mes")}</span>
                  </div>
                </div>
                <span style={{ color: C.muted, fontSize: 20, transition: "transform 0.2s", transform: planOpen ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
              </Pressable>

              {planOpen && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, animation: "athlosFade 0.2s ease" }}>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 27, color: C.text, letterSpacing: "-0.02em" }}>{plan.earlyBird}</span>
                    <span style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted }}>{t("/mes · early bird")}</span>
                    <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, marginTop: 4 }}>{t("Redna cena:")} {plan.regular}{t("/mes")}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="6" fill={`${plan.color}20`} />
                          <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke={plan.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontFamily: C.display, fontSize: 15.5, color: C.text2 }}>{t(f)}</span>
                      </div>
                    ))}
                  </div>
                  {plan.note && <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, marginTop: 12 }}>{t(plan.note)}</div>}
                </div>
              )}
            </>
          );
        })()}
      </SettingsBlock>
    </div>
  );
}
