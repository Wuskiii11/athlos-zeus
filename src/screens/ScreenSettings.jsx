import React, { useState } from "react";
import { useTheme, LANDING_URL } from "../theme";
import { Pressable } from "../components/UI";
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
  const dark = C.name === "dark";

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

  const inp = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontFamily: C.display, fontWeight: 600, fontSize: 17, outline: "none", boxSizing: "border-box", colorScheme: dark ? "dark" : "light", marginTop: 8 };
  const primaryBtn = { borderRadius: 999, border: "none", background: C.accent, color: "#ffffff", fontFamily: C.display, fontWeight: 800, cursor: "pointer", WebkitTapHighlightColor: "transparent" };
  const outlineBtn = { borderRadius: 999, border: `1px solid ${C.border2}`, background: "transparent", color: C.text, fontFamily: C.display, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" };

  // ── Menu row — tinted icon chip · label · arrow (the reference list) ──
  const Row = ({ d, label, onClick, danger, right }) => (
    <Pressable onClick={onClick} scale={0.99} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 2px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
      <span style={{ width: 40, height: 40, borderRadius: 13, background: danger ? `${C.red}16` : `${C.accent}14`, color: danger ? C.red : C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
      </span>
      <span style={{ flex: 1, fontFamily: C.display, fontWeight: 600, fontSize: 15.5, color: danger ? C.red : C.text }}>{label}</span>
      {right || (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </Pressable>
  );

  return (
    <div style={{ padding: "10px 18px 28px" }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

      {/* ── Hero — big ringed avatar with a pencil badge, name centered ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 8px", marginBottom: 14 }}>
        <div style={{ position: "relative" }}>
          <Pressable
            onClick={() => (profile.photo ? setPhotoPreview(true) : fileRef.current?.click())}
            scale={0.96}
            style={{
              width: 112, height: 112, borderRadius: "50%", padding: 0, overflow: "hidden",
              border: `4px solid ${C.surface}`,
              boxShadow: `0 12px 30px rgba(0,0,0,${dark ? 0.4 : 0.14}), 0 0 0 1px ${C.border}`,
              background: `${C.accent}1a`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.accent, fontWeight: 800, fontSize: 42, fontFamily: C.display, flexShrink: 0,
            }}
          >
            {profile.photo ? <img src={profile.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
          </Pressable>
          {/* pencil badge — straight to the photo picker */}
          <button onClick={() => fileRef.current?.click()} aria-label={t("Zamenjaj sliko")} style={{
            position: "absolute", left: "50%", bottom: -13, transform: "translateX(-50%)",
            width: 36, height: 36, borderRadius: "50%", cursor: "pointer",
            background: C.surface, border: `1px solid ${C.border}`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
            color: C.accent, display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </button>
        </div>
        <div style={{ fontFamily: C.display, fontWeight: 800, fontSize: 21.5, color: C.text, marginTop: 26 }}>{profile.name}</div>
      </div>

      {/* ── Menu card ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "8px 16px", boxShadow: dark ? "none" : "0 10px 30px rgba(28,24,20,0.06)" }}>
        <Row
          d={<><circle cx="12" cy="8" r="3.6" /><path d="M5 20v-1a7 7 0 0114 0v1" /></>}
          label={t("Uredi profil")}
          onClick={onAccount}
        />
        <Row
          d={theme === "dark"
            ? <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            : <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></>}
          label={`${t("Tema")} · ${theme === "dark" ? t("Temna") : t("Svetla")}`}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <Row
          d={<><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.2-3 4M12 17h.01" /></>}
          label={t("Pogosta vprašanja")}
          onClick={() => setOpenFaq(openFaq === null ? true : null)}
        />
        {openFaq !== null && (
          <div style={{ animation: "athlosFade 0.2s ease", padding: "0 2px 12px" }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <Pressable
                  onClick={() => setOpenFaq(openFaq === i ? true : i)}
                  scale={0.99}
                  style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: "11px 0", gap: 12 }}
                >
                  <span style={{ fontFamily: C.display, fontWeight: 600, fontSize: 14.5, color: C.text, flex: 1 }}>{t(item.q)}</span>
                  <span style={{ color: C.muted, fontSize: 17, transition: "transform 0.2s", transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
                </Pressable>
                {openFaq === i && (
                  <div style={{ padding: "0 0 12px", animation: "athlosFade 0.2s ease" }}>
                    <p style={{ fontFamily: C.display, fontSize: 14, color: C.text2, lineHeight: 1.6, margin: 0 }}>{t(item.a)}</p>
                  </div>
                )}
                {i < FAQ_ITEMS.length - 1 && <div style={{ height: 1, background: C.border }} />}
              </div>
            ))}
          </div>
        )}
        <Row
          d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>}
          label={t("Pošlji sporočilo")}
          onClick={() => { setContactOpen((v) => !v); setContactSent(false); }}
        />
        {contactOpen && (contactSent ? (
          <div style={{ padding: 18, margin: "0 2px 12px", borderRadius: 14, background: `${C.accent}14`, border: `1px solid ${C.accent}40`, textAlign: "center", animation: "athlosFade 0.2s ease" }}>
            <div style={{ fontSize: 27, marginBottom: 8 }}>✓</div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.accent }}>{t("Sporočilo poslano!")}</div>
            <div style={{ fontFamily: C.display, fontSize: 14.5, color: C.text2, marginTop: 4 }}>{t("Odgovorili vam bomo v 24 urah.")}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 2px 12px", animation: "athlosFade 0.2s ease" }}>
            <textarea
              value={contactMsg}
              onChange={(e) => setContactMsg(e.target.value)}
              placeholder={t("Opišite vašo težavo ali vprašanje...")}
              rows={4}
              style={{ ...inp, resize: "none", lineHeight: 1.5, marginTop: 0 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { setContactOpen(false); setContactMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "13px", fontSize: 14.5 }}>{t("Prekliči")}</button>
              <button onClick={sendContact} style={{ ...primaryBtn, flex: 2, padding: "13px", fontSize: 14.5, opacity: contactMsg.trim() ? 1 : 0.4 }}>{t("Pošlji")}</button>
            </div>
          </div>
        ))}
        <Row
          d={<><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></>}
          label={t("Politika zasebnosti")}
          onClick={onPrivacy}
        />
        <Row
          d={<><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>}
          label={t("Spletna stran")}
          onClick={() => window.open(LANDING_URL, "_blank", "noopener,noreferrer")}
        />
        <Row
          danger
          d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>}
          label={t("Odjava")}
          onClick={onLogout}
        />
      </div>

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
