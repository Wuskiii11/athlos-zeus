import React, { useState } from "react";
import { useTheme, LANDING_URL } from "../theme";
import { Pressable, SettingsBlock, LanguageSwitcher } from "../components/UI";
import { changePassword } from "../lib/api";
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

const FAQ_ITEMS = [
  { q: "Kako dodam nov trening?", a: "Pojdi na zavihek Trening, pritisni 'Začni trening' in sledi navodilom. Aplikacija te vodi skozi vsako vajo." },
  { q: "Kako deluje regeneracijski score?", a: "Score temelji na tvojih podatkih o spanju, HRV in srčnem utripu v mirovanju. Višji score pomeni boljšo pripravljenost za trening." },
  { q: "Ali so moji podatki varni?", a: "Vsi podatki so shranjeni lokalno na tvojem telefonu. Nič ni poslano na strežnike brez tvoje privolitve." },
  { q: "Kako sinhroniziram z uro?", a: "Trenutno podpiramo Apple Watch in Garmin. Pojdi v Nastavitve → Naprave in sledni navodilom za povezavo." },
  { q: "Kako spremenem cilj sezone?", a: "Odpri zavihek Sezona, pritisni na cilj in ga uredi. Aplikacija samodejno prilagodi tvoj program." },
  { q: "Zakaj ne vidim napredka?", a: "Napredek se izračuna po vsaj 2 tednih rednega beleženja. Poskrbi, da redno vnaša treninge in spanje." },
];

export default function ScreenSettings({ profile, setProfile, theme, setTheme, onPrivacy, onLogout }) {
  const C = useTheme();
  const t = useT();
  const fileRef = React.useRef(null);
  const [name, setName] = useState(profile.name);
  const [editingName, setEditingName] = useState(false);

  // Password change
  const [changingPw, setChangingPw] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // Plan — lives on the profile so it's saved per account (backend/localStorage)
  const currentPlan = profile.plan || "basic";
  const [planOpen, setPlanOpen] = useState(false);
  const curLang = profile.lang === "en" ? "en" : "sl";
  const setLang = (lang) => setProfile((p) => ({ ...p, lang }));

  // Notification permission
  const [notifPerm, setNotifPerm] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) return Notification.permission;
    return "unsupported";
  });
  const toggleNotifs = async () => {
    if (!("Notification" in window) || notifPerm === "denied" || notifPerm === "granted") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  // FAQ
  const [openFaq, setOpenFaq] = useState(null);

  // Contact
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);

  // Full-screen profile-photo preview (tap the avatar, TikTok-style)
  const [photoPreview, setPhotoPreview] = useState(false);

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, photo: reader.result }));
    reader.readAsDataURL(f);
  };

  const saveName = () => {
    setProfile((p) => ({ ...p, name: name.trim() || "Športnik" }));
    setEditingName(false);
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

  const sendContact = () => {
    if (!contactMsg.trim()) return;
    setContactSent(true);
    setTimeout(() => { setContactOpen(false); setContactMsg(""); setContactSent(false); }, 2000);
  };

  const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
  const inp = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 15, outline: "none", boxSizing: "border-box", colorScheme: C.name === "dark" ? "dark" : "light", marginTop: 8 };
  const editBtn = { padding: "9px 16px", borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.accent, fontFamily: C.display, fontSize: 13, fontWeight: 700 };
  const primaryBtn = { borderRadius: 999, border: "none", background: C.accent, color: "#ffffff", fontFamily: C.display, fontWeight: 800, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
  const outlineBtn = { borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" };

  return (
    <div style={{ padding: "10px 18px 28px" }}>
      <header style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 26, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>{t("Nastavitve")}</h2>
      </header>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

      {/* Profile row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, marginBottom: 16 }}>
        {/* Tap the avatar to preview it full-screen (TikTok-style); with no
            photo yet there's nothing to preview, so it opens the picker instead. */}
        <Pressable onClick={() => (profile.photo ? setPhotoPreview(true) : fileRef.current?.click())} scale={0.94} style={{ position: "relative", width: 60, height: 60, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.surface2, padding: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 800, fontSize: 24, fontFamily: C.display, flexShrink: 0 }}>
          {profile.photo ? <img src={profile.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
        </Pressable>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 18, color: C.text }}>{profile.name}</div>
          <div style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13, color: C.muted, marginTop: 2 }}>{profile.sport || "—"}</div>
        </div>
        <Pressable onClick={() => fileRef.current && fileRef.current.click()} scale={0.95} style={editBtn}>{t("Slika")}</Pressable>
      </div>

      {/* Username */}
      <SettingsBlock title={t("UPORABNIŠKO IME")}>
        {!editingName ? (
          <div style={row}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15, color: C.text }}>{profile.name}</span>
            <Pressable onClick={() => { setName(profile.name); setEditingName(true); }} scale={0.95} style={editBtn}>{t("Uredi")}</Pressable>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} style={{ flex: 1, padding: "13px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            <Pressable onClick={saveName} scale={0.93} style={{ ...primaryBtn, padding: "0 20px" }}>{t("Shrani")}</Pressable>
          </div>
        )}
      </SettingsBlock>

      {/* Language */}
      <SettingsBlock title={t("JEZIK")}>
        <LanguageSwitcher value={curLang} onChange={setLang} />
      </SettingsBlock>

      {/* Theme */}
      <SettingsBlock title={t("TEMA")}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTheme("dark")} style={{ flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer", border: `1px solid ${theme === "dark" ? C.accent : C.border}`, background: theme === "dark" ? `${C.accent}14` : "transparent", color: theme === "dark" ? C.accent : C.muted, fontFamily: C.display, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            {t("Temna")}
          </button>
          <button onClick={() => setTheme("light")} style={{ flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer", border: `1px solid ${theme === "light" ? C.accent : C.border}`, background: theme === "light" ? `${C.accent}14` : "transparent", color: theme === "light" ? C.accent : C.muted, fontFamily: C.display, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
            {t("Svetla")}
          </button>
        </div>
      </SettingsBlock>

      {/* Notifications */}
      <SettingsBlock title={t("OBVESTILA")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{t("Potisna obvestila")}</span>
            <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, marginTop: 3 }}>
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
          <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, marginTop: 10, padding: "10px 12px", borderRadius: 10, background: C.surface2, lineHeight: 1.5 }}>
            {t("Odpri nastavitve naprave → Aplikacije → Brskalnik → Obvestila in jih dovoli.")}
          </div>
        )}
      </SettingsBlock>

      {/* Password */}
      <SettingsBlock title={t("GESLO")}>
        {!changingPw ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={row}>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{t("Spremeni geslo")}</span>
              <Pressable onClick={() => setChangingPw(true)} scale={0.95} style={editBtn}>{t("Uredi")}</Pressable>
            </div>
            <div style={{ width: "100%", height: 1, background: C.border }} />
            <div style={row}>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text2 }}>{t("Pozabljeno geslo?")}</span>
              <Pressable onClick={() => window.open(LANDING_URL, "_blank", "noopener,noreferrer")} scale={0.95} style={editBtn}>{t("Ponastavi")}</Pressable>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12, color: C.muted }}>{t("TRENUTNO GESLO")}</span>
            <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="••••••••" style={inp} />
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12, color: C.muted, marginTop: 8 }}>{t("NOVO GESLO")}</span>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" style={inp} />
            {pwMsg && (
              <div style={{ padding: "11px 14px", borderRadius: 14, background: pwMsg.startsWith("✓") ? `${C.accent}14` : `${C.red}14`, border: `1px solid ${pwMsg.startsWith("✓") ? C.accent : C.red}40`, color: pwMsg.startsWith("✓") ? C.accent : C.red, fontFamily: C.display, fontSize: 13, marginTop: 10 }}>{t(pwMsg)}</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { setChangingPw(false); setOldPw(""); setNewPw(""); setPwMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 13 }}>{t("Prekliči")}</button>
              <button onClick={savePassword} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 13 }}>{t("Shrani geslo")}</button>
            </div>
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
                  <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{t("Trenutni plan")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <span style={{ padding: "4px 12px", borderRadius: 999, background: `${plan.color}1a`, border: `1px solid ${plan.color}40` }}>
                      <span style={{ fontFamily: C.display, fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", color: plan.color }}>{plan.name}</span>
                    </span>
                    <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13, color: C.muted }}>{plan.earlyBird}{t("/mes")}</span>
                  </div>
                </div>
                <span style={{ color: C.muted, fontSize: 18, transition: "transform 0.2s", transform: planOpen ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
              </Pressable>

              {planOpen && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, animation: "athlosFade 0.2s ease" }}>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.02em" }}>{plan.earlyBird}</span>
                    <span style={{ fontFamily: C.display, fontSize: 12, color: C.muted }}>{t("/mes · early bird")}</span>
                    <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, marginTop: 4 }}>{t("Redna cena:")} {plan.regular}{t("/mes")}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="6" fill={`${plan.color}20`} />
                          <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke={plan.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontFamily: C.display, fontSize: 14, color: C.text2 }}>{t(f)}</span>
                      </div>
                    ))}
                  </div>
                  {plan.note && <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, marginTop: 12 }}>{t(plan.note)}</div>}
                </div>
              )}
            </>
          );
        })()}
      </SettingsBlock>

      {/* FAQ */}
      <SettingsBlock title={t("POMOČ")}>
        {!openFaq ? (
          <Pressable
            onClick={() => setOpenFaq(true)}
            scale={0.99}
            style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}
          >
            <div>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{t("Pogosta vprašanja")}</span>
              <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, textTransform: "lowercase", marginTop: 3 }}>{FAQ_ITEMS.length} {t("vprašanj in odgovorov")}</div>
            </div>
            <span style={{ color: C.muted, fontSize: 18 }}>›</span>
          </Pressable>
        ) : (
          <div style={{ animation: "athlosFade 0.2s ease" }}>
            <Pressable
              onClick={() => { setOpenFaq(null); }}
              scale={0.99}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: "0 0 14px", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13, color: C.muted }}>{t("ZAPRI")}</span>
            </Pressable>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i}>
                  <Pressable
                    onClick={() => setOpenFaq(openFaq === i ? true : i)}
                    scale={0.99}
                    style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: "11px 0", gap: 12 }}
                  >
                    <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text, flex: 1 }}>{t(item.q)}</span>
                    <span style={{ color: C.muted, fontSize: 16, transition: "transform 0.2s", transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
                  </Pressable>
                  {openFaq === i && (
                    <div style={{ padding: "0 0 12px", animation: "athlosFade 0.2s ease" }}>
                      <p style={{ fontFamily: C.display, fontSize: 13, color: C.text2, lineHeight: 1.6, margin: 0 }}>{t(item.a)}</p>
                    </div>
                  )}
                  {i < FAQ_ITEMS.length - 1 && <div style={{ height: 1, background: C.border }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsBlock>

      {/* Contact */}
      <SettingsBlock title={t("KONTAKTIRAJ OSEBJE")}>
        {!contactOpen ? (
          <Pressable
            onClick={() => setContactOpen(true)}
            scale={0.99}
            style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}
          >
            <div>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{t("Pošlji sporočilo")}</span>
              <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, textTransform: "lowercase", marginTop: 3 }}>{t("odgovorimo v 24 urah")}</div>
            </div>
            <span style={{ color: C.muted, fontSize: 18 }}>›</span>
          </Pressable>
        ) : contactSent ? (
          <div style={{ padding: 18, borderRadius: 14, background: `${C.accent}14`, border: `1px solid ${C.accent}40`, textAlign: "center", animation: "athlosFade 0.2s ease" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 14, color: C.accent }}>{t("Sporočilo poslano!")}</div>
            <div style={{ fontFamily: C.display, fontSize: 13, color: C.text2, marginTop: 4 }}>{t("Odgovorili vam bomo v 24 urah.")}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "athlosFade 0.2s ease" }}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12, color: C.muted }}>{t("VAŠE SPOROČILO")}</span>
            <textarea
              value={contactMsg}
              onChange={(e) => setContactMsg(e.target.value)}
              placeholder={t("Opišite vašo težavo ali vprašanje...")}
              rows={4}
              style={{ ...inp, resize: "none", lineHeight: 1.5 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { setContactOpen(false); setContactMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 13 }}>{t("Prekliči")}</button>
              <button onClick={sendContact} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 13, opacity: contactMsg.trim() ? 1 : 0.4 }}>{t("Pošlji")}</button>
            </div>
          </div>
        )}
      </SettingsBlock>

      {/* Legal */}
      <SettingsBlock title={t("PRAVNO")}>
        <Pressable onClick={onPrivacy} scale={0.99} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}>
          <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>{t("Politika zasebnosti")}</span>
          <span style={{ color: C.muted, fontSize: 18 }}>›</span>
        </Pressable>
      </SettingsBlock>

      {/* Website */}
      <SettingsBlock title={t("SPLETNA STRAN")}>
        <Pressable onClick={() => window.open(LANDING_URL, "_blank", "noopener,noreferrer")} scale={0.99} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}>
          <div>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text }}>ATHLOS</span>
            <div style={{ fontFamily: C.display, fontSize: 12, color: C.muted, textTransform: "lowercase", marginTop: 3 }}>{t("odpre v brskalniku")}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </Pressable>
      </SettingsBlock>

      <Pressable onClick={onLogout} scale={0.98} style={{ width: "100%", marginTop: 24, padding: 15, borderRadius: 999, border: `1px solid ${C.red}40`, background: `${C.red}14`, color: C.red, fontFamily: C.display, fontWeight: 700, fontSize: 14 }}>{t("Odjava")}</Pressable>
      <p style={{ textAlign: "center", color: C.muted2, fontFamily: C.display, fontSize: 12, marginTop: 22 }}>ATHLOS v0.6 · © 2026</p>

      {/* Full-screen photo preview — TikTok-style: tap the avatar, see it big,
          tap the ✕ or backdrop to dismiss, or jump straight to changing it. */}
      {photoPreview && profile.photo && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPhotoPreview(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(10,9,8,0.94)", display: "flex", flexDirection: "column", animation: "athlosFade 0.2s ease" }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "max(16px, env(safe-area-inset-top, 16px)) 18px 12px" }}>
            <button onClick={() => setPhotoPreview(false)} aria-label={t("Zapri")} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(244,239,230,0.28)", background: "rgba(244,239,230,0.08)", color: "#F4EFE6", fontSize: 20, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}>×</button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
            <img src={profile.photo} alt="" style={{ width: "100%", maxWidth: 420, aspectRatio: "1 / 1", borderRadius: 20, objectFit: "cover", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "12px 24px max(24px, env(safe-area-inset-bottom, 24px))" }}>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 16, color: "#F4EFE6" }}>{profile.name}</div>
            <button
              onClick={() => { setPhotoPreview(false); fileRef.current?.click(); }}
              style={{ padding: "10px 22px", borderRadius: 999, border: "1px solid rgba(244,239,230,0.3)", background: "rgba(244,239,230,0.08)", color: "#F4EFE6", fontFamily: C.display, fontWeight: 700, fontSize: 13, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
            >
              {t("Zamenjaj sliko")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
