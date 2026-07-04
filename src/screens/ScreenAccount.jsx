import React, { useState } from "react";
import { useTheme } from "../theme";
import { Pressable, SettingsBlock, BackBtn, Mono } from "../components/UI";
import { changePassword, requestPasswordReset, changeEmail } from "../lib/api";
import { useT } from "../lib/i18n";

// Account identity + security — split out of the main Settings list so that
// list doesn't have to carry name/email/password alongside theme/notifications/
// plan/legal. Reached from Settings via the "Račun" row.
export default function ScreenAccount({ profile, setProfile, user, onBack }) {
  const C = useTheme();
  const t = useT();

  const [name, setName] = useState(profile.name);
  const [editingName, setEditingName] = useState(false);

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
  const inp = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 15, outline: "none", boxSizing: "border-box" };
  const editBtn = { padding: "9px 16px", borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.accent, fontFamily: C.display, fontSize: 13, fontWeight: 700 };
  const primaryBtn = { borderRadius: 999, border: "none", background: C.accent, color: "#ffffff", fontFamily: C.display, fontWeight: 800, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
  const outlineBtn = { borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
  const msgBox = (ok) => ({ padding: "11px 14px", borderRadius: 14, background: ok ? `${C.accent}14` : `${C.red}14`, border: `1px solid ${ok ? C.accent : C.red}40`, color: ok ? C.accent : C.red, fontFamily: C.display, fontSize: 13, marginTop: 10 });

  const saveName = () => {
    setProfile((p) => ({ ...p, name: name.trim() || "Športnik" }));
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
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 24, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>{t("Račun")}</h2>
      </header>

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

      {/* Email */}
      <SettingsBlock title={t("E-POŠTA")}>
        {!editingEmail ? (
          <div style={row}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15, color: C.text }}>{email || t("Ni nastavljeno")}</span>
            <Pressable onClick={() => { setEmailMsg(""); setEditingEmail(true); }} scale={0.95} style={editBtn}>{t("Uredi")}</Pressable>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ime@email.com" style={inp} />
            {emailMsg && <div style={msgBox(emailMsg.startsWith("✓"))}>{t(emailMsg)}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              <button onClick={() => { setEditingEmail(false); setEmail(user?.email || ""); setEmailMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 13 }}>{t("Prekliči")}</button>
              <button onClick={saveEmail} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 13 }}>{t("Shrani")}</button>
            </div>
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
              <div>
                <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14, color: C.text2 }}>{t("Pozabljeno geslo?")}</span>
                {email && <Mono style={{ display: "block", color: C.muted, fontSize: 9, marginTop: 3 }}>{email}</Mono>}
              </div>
              <Pressable onClick={sendReset} disabled={resetting} scale={0.95} style={{ ...editBtn, opacity: resetting ? 0.6 : 1 }}>{resetting ? t("Pošiljam…") : t("Ponastavi")}</Pressable>
            </div>
            {resetMsg && <div style={msgBox(resetMsg.startsWith("✓"))}>{t(resetMsg)}</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12, color: C.muted }}>{t("TRENUTNO GESLO")}</span>
            <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="••••••••" style={inp} />
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 12, color: C.muted, marginTop: 8 }}>{t("NOVO GESLO")}</span>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" style={inp} />
            {pwMsg && <div style={msgBox(pwMsg.startsWith("✓"))}>{t(pwMsg)}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { setChangingPw(false); setOldPw(""); setNewPw(""); setPwMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 13 }}>{t("Prekliči")}</button>
              <button onClick={savePassword} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 13 }}>{t("Shrani geslo")}</button>
            </div>
          </div>
        )}
      </SettingsBlock>
    </div>
  );
}
