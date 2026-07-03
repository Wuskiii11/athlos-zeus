import React, { useState } from "react";
import { LANDING_URL } from "../theme";
import { LanguageSwitcher } from "../components/UI";
import { signIn, signUp, signInWithProvider } from "../lib/api";
import { useT } from "../lib/i18n";

// ── Light "marble" palette for the entry experience ──
const L = {
  bg: "#F4EFE6",        // warm marble
  text: "#1C1814",
  text2: "rgba(28,24,20,0.78)",
  muted: "rgba(28,24,20,0.52)",
  muted2: "rgba(28,24,20,0.34)",
  surface: "#FCF9F2",
  surface2: "#FFFFFF",
  border: "rgba(28,24,20,0.16)",
  accent: "#1F7A52",
  accent2: "#00FF87",
  gold: "#B08D57",
  red: "#B1452F",
  heading: "'Cinzel',Georgia,serif",
  display: "'Cormorant Garamond',Georgia,serif",
};

const HERO = "/img/hero-zeus-ink.png";

// The blue Zeus engraving, cut from its paper → ink lines printed on the marble.
function HeroFigure({ h = 300 }) {
  return (
    <div className="ray-burst-light" style={{ position: "relative", display: "inline-grid", placeItems: "center" }}>
      <img src={HERO} alt="ZEUS" style={{
        position: "relative", zIndex: 1, height: h, width: "auto", maxWidth: "100%", objectFit: "contain",
      }} />
    </div>
  );
}

function Wordmark({ size = 34 }) {
  return (
    <div style={{ fontFamily: L.heading, fontWeight: 700, fontSize: size, letterSpacing: "0.30em", color: L.text, paddingLeft: "0.30em" }}>
      ATHL<span style={{ color: L.gold }}>OS</span>
    </div>
  );
}

function SocialBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "14px 10px", borderRadius: 14, border: `1px solid ${L.border}`, background: L.surface2,
      color: L.text, fontFamily: L.display, fontWeight: 600, fontSize: 14,
      cursor: "pointer", WebkitTapHighlightColor: "transparent", transition: "border-color 0.15s, box-shadow 0.15s",
      boxShadow: "0 1px 2px rgba(22,52,90,0.06)",
    }}
    onPointerEnter={(e) => { e.currentTarget.style.borderColor = `${L.accent}66`; }}
    onPointerLeave={(e) => { e.currentTarget.style.borderColor = L.border; }}>
      {children}
    </button>
  );
}

function LaunchAnimation({ onDone }) {
  React.useEffect(() => {
    const timer = setTimeout(onDone, 1220);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="app-fullscreen" style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: L.bg,
      backgroundImage: "radial-gradient(120% 80% at 50% 6%, rgba(31,122,82,0.10), transparent 60%)",
      display: "grid", placeItems: "center", overflow: "hidden",
      animation: "athlosSplashFade 1.22s cubic-bezier(.2,.8,.2,1) forwards",
    }}>
      <style>{`
        @keyframes athlosSplashFade { 0%,74%{opacity:1} 100%{opacity:0} }
        @keyframes athlosHeroOpen {
          0% { opacity: 0; transform: scale(0.84); filter: blur(6px); }
          34% { opacity: 1; transform: scale(1); filter: blur(0); }
          70% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(3.2); filter: blur(8px); }
        }
        @media (prefers-reduced-motion: reduce) { .athlos-launch *{animation-duration:.001ms!important} }
      `}</style>
      <div className="athlos-launch" style={{ animation: "athlosHeroOpen 1.22s cubic-bezier(.18,.86,.24,1) forwards" }}>
        <HeroFigure h={220} />
      </div>
    </div>
  );
}

export default function LoginScreen({ profile, setProfile, onLogin, onPrivacy }) {
  const t = useT();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const slError = (msg = "") => {
    const m = msg.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered")) return "Račun s tem e-naslovom že obstaja. Prijavi se.";
    if (m.includes("invalid login credentials") || m.includes("napačni podatki")) return "Napačni podatki za prijavo.";
    if (m.includes("email not confirmed")) return "E-naslov še ni potrjen. Preveri svojo pošto.";
    if (m.includes("password should be") || m.includes("at least 6")) return "Geslo mora imeti vsaj 6 znakov.";
    if (m.includes("invalid email") || m.includes("validate email")) return "Vnesi veljaven e-naslov.";
    if (m.includes("rate limit") || m.includes("too many")) return "Preveč poskusov. Počakaj trenutek in poskusi znova.";
    if (m.includes("failed to fetch") || m.includes("network")) return "Ni povezave s strežnikom. Preveri internet.";
    return msg || "Prišlo je do napake. Poskusi znova.";
  };

  const submit = async () => {
    if (!email.includes("@") || password.length < 1) { setError("Vnesi veljaven e-naslov in geslo."); return; }
    setBusy(true); setError("");
    try {
      if (mode === "signup") {
        if (password.length < 6) { setError("Geslo mora imeti vsaj 6 znakov."); setBusy(false); return; }
        try { await signUp(email, password); }
        catch (e) { setError(slError(e.message)); setBusy(false); return; }
      }
      const u = await signIn(email, password);
      setPendingUser(u); setLaunching(true);
    } catch (e) {
      const msg = slError(e.message);
      if (mode === "signup" && msg.includes("Napačni podatki")) {
        setError("Račun s tem e-naslovom že obstaja, geslo pa ni pravilno. Prijavi se s pravim geslom ali uporabi drugo e-pošto.");
      } else { setError(msg); }
    } finally { setBusy(false); }
  };

  const social = async (provider) => {
    setError(""); setBusy(true);
    try { await signInWithProvider(provider); }
    catch (e) {
      const m = (e.message || "").toLowerCase();
      if (m.includes("not enabled") || m.includes("unsupported provider") || m.includes("validation_failed")) {
        setError(provider === "apple" ? "Prijava z Apple računom še ni vklopljena." : "Prijava z Google računom še ni vklopljena.");
      } else { setError(slError(e.message)); }
      setBusy(false);
    }
  };

  const inp = {
    width: "100%", padding: "15px 18px", borderRadius: 14,
    border: `1px solid ${L.border}`, background: L.surface2,
    color: L.text, fontFamily: L.display, fontWeight: 500,
    fontSize: 15, outline: "none", boxSizing: "border-box",
    marginTop: 8, transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: "inset 0 1px 2px rgba(22,52,90,0.05)",
  };
  const label = { fontFamily: L.heading, fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: L.muted };

  if (launching) return <LaunchAnimation onDone={() => onLogin(pendingUser)} />;
  const curLang = profile?.lang === "en" ? "en" : "sl";

  return (
    <div className="app-fullscreen" style={{
      position: "fixed", top: 0, left: 0, right: 0,
      background: L.bg,
      backgroundImage: "radial-gradient(125% 70% at 50% 2%, rgba(31,122,82,0.10) 0%, transparent 52%), radial-gradient(90% 50% at 88% 0%, rgba(176,141,87,0.08) 0%, transparent 55%)",
      display: "flex", flexDirection: "column",
      paddingTop: "env(safe-area-inset-top, 44px)", paddingBottom: "env(safe-area-inset-bottom, 0px)",
      overflowY: "auto", color: L.text,
    }}>
      <LanguageSwitcher
        value={curLang}
        onChange={(lang) => setProfile((p) => ({ ...p, lang }))}
        variant="floating"
        style={{ position: "fixed", top: "max(env(safe-area-inset-top, 14px), 14px)", right: "max(20px, calc((100vw - 430px) / 2 + 20px))", zIndex: 3 }}
      />

      <div style={{ flex: 1, width: "100%", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "8px 28px 36px", position: "relative", zIndex: 1 }}>

        {/* ── Hero ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <HeroFigure h={290} />
          <div style={{ marginTop: -6 }}><Wordmark size={34} /></div>
          <div style={{ width: 54, height: 1, margin: "16px 0 12px", background: `linear-gradient(90deg, transparent, ${L.gold}, transparent)` }} />
          <div style={{ fontFamily: L.heading, fontSize: 11, color: L.muted, textAlign: "center", letterSpacing: "0.30em", textTransform: "uppercase" }}>
            {t("sistem, ki pozna vsakega športnika")}
          </div>
        </div>

        {/* ── Social ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <SocialBtn onClick={() => social("apple")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Apple
          </SocialBtn>
          <SocialBtn onClick={() => social("google")}>
            <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </SocialBtn>
        </div>

        {/* ── Divider ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: L.border }} />
          <span style={{ ...label, fontSize: 9 }}>{t("ALI")}</span>
          <div style={{ flex: 1, height: 1, background: L.border }} />
        </div>

        {/* ── Email ── */}
        <div style={{ marginBottom: 12 }}>
          <span style={label}>{t("E-POŠTA")}</span>
          <input type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            onFocus={e => e.target.style.borderColor = `${L.accent}99`}
            onBlur={e => e.target.style.borderColor = L.border}
            placeholder="ime@email.com" autoComplete="email" style={inp} />
        </div>

        {/* ── Password ── */}
        <div style={{ marginBottom: 4, position: "relative" }}>
          <span style={label}>{t("GESLO")}</span>
          <input type={showPass ? "text" : "password"} value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            onFocus={e => e.target.style.borderColor = `${L.accent}99`}
            onBlur={e => e.target.style.borderColor = L.border}
            placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} style={{ ...inp, paddingRight: 44 }} />
          <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, bottom: 13, background: "none", border: "none", color: L.muted, cursor: "pointer", padding: 4, lineHeight: 0 }}>
            {showPass
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18.1 18.1 0 015.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18.1 18.1 0 01-2.14 2.86M1 1l22 22"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
        </div>

        {error && (
          <div style={{ color: L.red, fontSize: 12.5, marginTop: 10, fontFamily: L.display, padding: "10px 12px", borderRadius: 10, background: `${L.red}12`, border: `1px solid ${L.red}3a` }}>
            {t(error)}
          </div>
        )}

        <button onClick={() => window.open(LANDING_URL, "_blank", "noopener,noreferrer")} style={{ alignSelf: "flex-end", background: "none", border: "none", color: L.muted, fontFamily: L.display, fontSize: 12, fontWeight: 500, cursor: "pointer", marginTop: 10, padding: 0 }}>
          {t("Pozabljeno geslo?")}
        </button>

        {/* ── Primary CTA ── */}
        <button onClick={submit} disabled={busy} style={{
          marginTop: 18, width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: busy ? "default" : "pointer",
          background: `linear-gradient(180deg, ${L.accent2}, ${L.accent})`, color: "#FFFFFF",
          fontFamily: L.heading, fontWeight: 700, fontSize: 14, letterSpacing: "0.16em", textTransform: "uppercase",
          boxShadow: `0 10px 26px ${L.accent}44, inset 0 1px 0 rgba(255,255,255,0.3)`, opacity: busy ? 0.6 : 1,
          WebkitTapHighlightColor: "transparent",
        }}>
          {busy ? t("Počakaj…") : mode === "signup" ? t("Ustvari račun") : t("Vstopi")}
        </button>

        <p style={{ textAlign: "center", color: L.muted, fontSize: 13, marginTop: 20, fontFamily: L.display, lineHeight: 1.5 }}>
          {mode === "signup" ? t("Že imaš račun?") : t("Še nimaš računa?")}{" "}
          {mode === "signup" ? (
            <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", padding: 0, color: L.accent, fontWeight: 700, fontFamily: L.display, fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Prijava")}
            </button>
          ) : (
            <button onClick={() => { setMode("signup"); setError(""); }} style={{ background: "none", border: "none", padding: 0, color: L.accent, fontWeight: 700, fontFamily: L.display, fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Registracija")}
            </button>
          )}
        </p>

        <button onClick={onPrivacy} style={{ background: "none", border: "none", color: L.muted2, fontFamily: L.display, fontSize: 12, fontWeight: 500, cursor: "pointer", marginTop: 14, padding: 0, textAlign: "center", width: "100%" }}>
          {t("Politika zasebnosti")}
        </button>
      </div>
    </div>
  );
}
