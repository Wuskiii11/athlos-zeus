import React, { useState } from "react";
import { useTheme, LANDING_URL } from "../theme";
import { Pressable, SettingsBlock } from "../components/UI";
import { uploadAvatar } from "../lib/api";
import { useT } from "../lib/i18n";

const FAQ_ITEMS = [
  { q: "Kako dodam nov trening?", a: "Pojdi na zavihek Trening, pritisni 'Začni trening' in sledi navodilom. Aplikacija te vodi skozi vsako vajo." },
  { q: "Kako deluje regeneracijski score?", a: "Score temelji na tvojih podatkih o spanju, HRV in srčnem utripu v mirovanju. Višji score pomeni boljšo pripravljenost za trening." },
  { q: "Ali so moji podatki varni?", a: "Vsi podatki so shranjeni lokalno na tvojem telefonu. Nič ni poslano na strežnike brez tvoje privolitve." },
  { q: "Kako sinhroniziram z uro?", a: "Trenutno podpiramo Apple Watch in Garmin. Pojdi v Nastavitve → Naprave in sledni navodilom za povezavo." },
  { q: "Kako spremenem cilj sezone?", a: "Odpri zavihek Sezona, pritisni na cilj in ga uredi. Aplikacija samodejno prilagodi tvoj program." },
  { q: "Zakaj ne vidim napredka?", a: "Napredek se izračuna po vsaj 2 tednih rednega beleženja. Poskrbi, da redno vnaša treninge in spanje." },
];

export default function ScreenSettings({ profile, setProfile, user, theme, setTheme, onPrivacy, onAccount, onLogout }) {
  const C = useTheme();
  const t = useT();
  const fileRef = React.useRef(null);

  // FAQ
  const [openFaq, setOpenFaq] = useState(null);

  // Contact
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);

  // Full-screen profile-photo preview (tap the avatar, TikTok-style)
  const [photoPreview, setPhotoPreview] = useState(false);

  const initial = (profile.name || "?").trim().charAt(0).toUpperCase();

  // Downscale to ≤512px JPEG — uploads stay small and the offline fallback
  // (data URL) fits in the profile cache without breaking the cloud upsert.
  const compressImage = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress failed"))), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const blob = await compressImage(f);
      // Cloud first: a Storage URL persists on the account across devices.
      // If the upload fails (offline, no bucket), fall back to a local data URL.
      let photo = null;
      if (user?.id && user.id !== "local") {
        try { photo = await uploadAvatar(user.id, blob); } catch {}
      }
      if (!photo) {
        photo = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(blob);
        });
      }
      setProfile((p) => ({ ...p, photo }));
    } catch {}
  };

  const sendContact = () => {
    if (!contactMsg.trim()) return;
    setContactSent(true);
    setTimeout(() => { setContactOpen(false); setContactMsg(""); setContactSent(false); }, 2000);
  };

  const inp = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 17, outline: "none", boxSizing: "border-box", colorScheme: C.name === "dark" ? "dark" : "light", marginTop: 8 };
  const editBtn = { padding: "9px 16px", borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.accent, fontFamily: C.display, fontSize: 14.5, fontWeight: 700 };
  const primaryBtn = { borderRadius: 999, border: "none", background: C.accent, color: "#ffffff", fontFamily: C.display, fontWeight: 800, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
  const outlineBtn = { borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" };

  return (
    <div style={{ padding: "10px 18px 28px" }}>
      <header style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 29, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>{t("Nastavitve")}</h2>
      </header>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

      {/* Profile row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, marginBottom: 16 }}>
        {/* Tap the avatar to preview it full-screen (TikTok-style); with no
            photo yet there's nothing to preview, so it opens the picker instead. */}
        <Pressable onClick={() => (profile.photo ? setPhotoPreview(true) : fileRef.current?.click())} scale={0.94} style={{ position: "relative", width: 60, height: 60, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.surface2, padding: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 800, fontSize: 27, fontFamily: C.display, flexShrink: 0 }}>
          {profile.photo ? <img src={profile.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
        </Pressable>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 20, color: C.text }}>{profile.name}</div>
          <div style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted, marginTop: 2 }}>{profile.sport || "—"}</div>
        </div>
        <Pressable onClick={() => fileRef.current && fileRef.current.click()} scale={0.95} style={editBtn}>{t("Slika")}</Pressable>
      </div>

      {/* Account — name, e-mail, password, language and plan now live on
          their own screen */}
      <SettingsBlock title={t("RAČUN")}>
        <Pressable onClick={onAccount} scale={0.99} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}>
          <div>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 17, color: C.text }}>{profile.name}</span>
            <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, marginTop: 3 }}>{t("Ime, e-pošta, geslo, jezik, obvestila in plan")}</div>
          </div>
          <span style={{ color: C.muted, fontSize: 20 }}>›</span>
        </Pressable>
      </SettingsBlock>

      {/* Theme */}
      <SettingsBlock title={t("TEMA")}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTheme("dark")} style={{ flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer", border: `1px solid ${theme === "dark" ? C.accent : C.border}`, background: theme === "dark" ? `${C.accent}14` : "transparent", color: theme === "dark" ? C.accent : C.muted, fontFamily: C.display, fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            {t("Temna")}
          </button>
          <button onClick={() => setTheme("light")} style={{ flex: 1, padding: "13px", borderRadius: 14, cursor: "pointer", border: `1px solid ${theme === "light" ? C.accent : C.border}`, background: theme === "light" ? `${C.accent}14` : "transparent", color: theme === "light" ? C.accent : C.muted, fontFamily: C.display, fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
            {t("Svetla")}
          </button>
        </div>
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
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{t("Pogosta vprašanja")}</span>
              <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, textTransform: "lowercase", marginTop: 3 }}>{FAQ_ITEMS.length} {t("vprašanj in odgovorov")}</div>
            </div>
            <span style={{ color: C.muted, fontSize: 20 }}>›</span>
          </Pressable>
        ) : (
          <div style={{ animation: "athlosFade 0.2s ease" }}>
            <Pressable
              onClick={() => { setOpenFaq(null); }}
              scale={0.99}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: "0 0 14px", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.muted }}>{t("ZAPRI")}</span>
            </Pressable>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i}>
                  <Pressable
                    onClick={() => setOpenFaq(openFaq === i ? true : i)}
                    scale={0.99}
                    style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: "11px 0", gap: 12 }}
                  >
                    <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text, flex: 1 }}>{t(item.q)}</span>
                    <span style={{ color: C.muted, fontSize: 18, transition: "transform 0.2s", transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
                  </Pressable>
                  {openFaq === i && (
                    <div style={{ padding: "0 0 12px", animation: "athlosFade 0.2s ease" }}>
                      <p style={{ fontFamily: C.display, fontSize: 14.5, color: C.text2, lineHeight: 1.6, margin: 0 }}>{t(item.a)}</p>
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
              <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{t("Pošlji sporočilo")}</span>
              <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, textTransform: "lowercase", marginTop: 3 }}>{t("odgovorimo v 24 urah")}</div>
            </div>
            <span style={{ color: C.muted, fontSize: 20 }}>›</span>
          </Pressable>
        ) : contactSent ? (
          <div style={{ padding: 18, borderRadius: 14, background: `${C.accent}14`, border: `1px solid ${C.accent}40`, textAlign: "center", animation: "athlosFade 0.2s ease" }}>
            <div style={{ fontSize: 27, marginBottom: 8 }}>✓</div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.accent }}>{t("Sporočilo poslano!")}</div>
            <div style={{ fontFamily: C.display, fontSize: 14.5, color: C.text2, marginTop: 4 }}>{t("Odgovorili vam bomo v 24 urah.")}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "athlosFade 0.2s ease" }}>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 13.5, color: C.muted }}>{t("VAŠE SPOROČILO")}</span>
            <textarea
              value={contactMsg}
              onChange={(e) => setContactMsg(e.target.value)}
              placeholder={t("Opišite vašo težavo ali vprašanje...")}
              rows={4}
              style={{ ...inp, resize: "none", lineHeight: 1.5 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { setContactOpen(false); setContactMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 14.5 }}>{t("Prekliči")}</button>
              <button onClick={sendContact} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 14.5, opacity: contactMsg.trim() ? 1 : 0.4 }}>{t("Pošlji")}</button>
            </div>
          </div>
        )}
      </SettingsBlock>

      {/* Legal */}
      <SettingsBlock title={t("PRAVNO")}>
        <Pressable onClick={onPrivacy} scale={0.99} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}>
          <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>{t("Politika zasebnosti")}</span>
          <span style={{ color: C.muted, fontSize: 20 }}>›</span>
        </Pressable>
      </SettingsBlock>

      {/* Website */}
      <SettingsBlock title={t("SPLETNA STRAN")}>
        <Pressable onClick={() => window.open(LANDING_URL, "_blank", "noopener,noreferrer")} scale={0.99} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0 }}>
          <div>
            <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: C.text }}>ATHLOS</span>
            <div style={{ fontFamily: C.display, fontSize: 13.5, color: C.muted, textTransform: "lowercase", marginTop: 3 }}>{t("odpre v brskalniku")}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </Pressable>
      </SettingsBlock>

      <Pressable onClick={onLogout} scale={0.98} style={{ width: "100%", marginTop: 24, padding: 15, borderRadius: 999, border: `1px solid ${C.red}40`, background: `${C.red}14`, color: C.red, fontFamily: C.display, fontWeight: 700, fontSize: 15.5 }}>{t("Odjava")}</Pressable>
      <p style={{ textAlign: "center", color: C.muted2, fontFamily: C.display, fontSize: 13.5, marginTop: 22 }}>ATHLOS v0.6 · © 2026</p>

      {/* Full-screen photo preview — TikTok-style: tap the avatar, see it big,
          tap the ✕ or backdrop to dismiss, or jump straight to changing it. */}
      {photoPreview && profile.photo && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPhotoPreview(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(10,9,8,0.94)", display: "flex", flexDirection: "column", animation: "athlosFade 0.2s ease" }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "max(16px, env(safe-area-inset-top, 16px)) 18px 12px" }}>
            <button onClick={() => setPhotoPreview(false)} aria-label={t("Zapri")} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(244,239,230,0.28)", background: "rgba(244,239,230,0.08)", color: "#F4EFE6", fontSize: 22.5, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}>×</button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
            <img src={profile.photo} alt="" style={{ width: "100%", maxWidth: 320, aspectRatio: "1 / 1", borderRadius: "50%", objectFit: "cover", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "12px 24px max(24px, env(safe-area-inset-bottom, 24px))" }}>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 18, color: "#F4EFE6" }}>{profile.name}</div>
            <button
              onClick={() => { setPhotoPreview(false); fileRef.current?.click(); }}
              style={{ padding: "10px 22px", borderRadius: 999, border: "1px solid rgba(244,239,230,0.3)", background: "rgba(244,239,230,0.08)", color: "#F4EFE6", fontFamily: C.display, fontWeight: 700, fontSize: 14.5, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
            >
              {t("Zamenjaj sliko")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
