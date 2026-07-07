import React, { useState } from "react";
import { LANDING_URL } from "../theme";
import { LanguageSwitcher } from "../components/UI";
import { signIn, signUp, signInWithProvider } from "../lib/api";
import { useT } from "../lib/i18n";

// ── Entry experience: full-bleed gym photo, always-dark chrome on top ──
const FONTS = { heading: "'Poppins',system-ui,sans-serif", display: "'Poppins',system-ui,sans-serif" };
const DARK = {
  bg: "#0A0A09", text: "#F2F5F2", text2: "rgba(242,245,242,0.80)", muted: "rgba(242,245,242,0.55)", muted2: "rgba(242,245,242,0.38)",
  surface: "rgba(255,255,255,0.05)", surface2: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.14)",
  accent: "#00FF87", accent2: "#33FFA3", gold: "#00FF87", red: "#C95A3F", ...FONTS,
};

const HERO = "/img/hero-zeus-ink.png";
const BG = "/img/login-gym.jpg";

// The Zeus engraving — used by the launch animation after a successful login.
function HeroFigure({ h = 300, dark }) {
  return (
    <div className="ray-burst-light" style={{ position: "relative", display: "inline-grid", placeItems: "center" }}>
      <img src={HERO} alt="ZEUS" style={{
        position: "relative", zIndex: 1, height: h, width: "auto", maxWidth: "100%", objectFit: "contain",
        filter: dark ? "invert(1) hue-rotate(180deg)" : "none",
      }} />
    </div>
  );
}

function Wordmark({ size = 34, p }) {
  return (
    <div style={{ fontFamily: "'Cinzel',Georgia,serif", fontWeight: 700, fontSize: size, letterSpacing: "0.30em", color: p.text, paddingLeft: "0.30em" }}>
      ATHL<span style={{ color: p.gold }}>OS</span>
    </div>
  );
}

function SocialBtn({ onClick, children, p }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "13px 10px", borderRadius: 14, border: `1px solid ${p.border}`, background: p.surface2,
      color: p.text, fontFamily: p.display, fontWeight: 600, fontSize: 15.5,
      cursor: "pointer", WebkitTapHighlightColor: "transparent", transition: "border-color 0.15s",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    }}
    onPointerEnter={(e) => { e.currentTarget.style.borderColor = `${p.accent}66`; }}
    onPointerLeave={(e) => { e.currentTarget.style.borderColor = p.border; }}>
      {children}
    </button>
  );
}

function LaunchAnimation({ onDone, p }) {
  React.useEffect(() => {
    const timer = setTimeout(onDone, 1220);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="app-fullscreen" style={{
      position: "fixed", inset: 0, zIndex: 1000, background: p.bg,
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
        <HeroFigure h={220} dark />
      </div>
    </div>
  );
}

export default function LoginScreen({ profile, setProfile, onLogin, onPrivacy }) {
  const t = useT();
  // The photo backdrop is dark in both app themes — the login chrome is always dark.
  const L = DARK;
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

  // Minimal underline fields, like the reference mock — transparent box,
  // hairline bottom border that lights up green on focus.
  const inp = {
    width: "100%", padding: "10px 2px", marginTop: 6, boxSizing: "border-box",
    background: "transparent", border: "none", borderRadius: 0,
    borderBottom: "1px solid rgba(255,255,255,0.30)",
    color: L.text, fontFamily: L.display, fontWeight: 500, fontSize: 17.5,
    outline: "none", transition: "border-color 0.2s", caretColor: L.accent,
  };
  const label = { fontFamily: L.heading, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: L.muted };
  const bigBtn = {
    width: "100%", padding: "16px", borderRadius: 14,
    fontFamily: L.heading, fontWeight: 700, fontSize: 14, letterSpacing: "0.16em", textTransform: "uppercase",
    cursor: "pointer", WebkitTapHighlightColor: "transparent", transition: "opacity 0.2s, transform 0.1s",
  };

  if (launching) return <LaunchAnimation onDone={() => onLogin(pendingUser)} p={L} />;
  const curLang = profile?.lang === "en" ? "en" : "sl";

  return (
    <div className="app-fullscreen" style={{
      // Fill the phone shell (top+bottom anchors, height from .app-fullscreen:100%).
      // No viewport units — iOS dvh/svh under-report and were the bottom band.
      position: "fixed", inset: 0,
      background: "#060807",
      display: "flex", flexDirection: "column",
      overflow: "hidden", color: L.text,
    }}>
      {/* photo backdrop — the athlete stays visible through the upper half */}
      <img src={BG} alt="" aria-hidden="true" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center top",
        pointerEvents: "none", userSelect: "none",
      }} />
      {/* legibility gradient — light at the top, near-solid behind the form */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(4,7,5,0.60) 0%, rgba(4,7,5,0.22) 26%, rgba(4,7,5,0.44) 48%, rgba(4,7,5,0.88) 70%, rgba(4,7,5,0.97) 100%)",
      }} />

      <LanguageSwitcher
        value={curLang}
        onChange={(lang) => setProfile((p) => ({ ...p, lang }))}
        variant="floating"
        style={{ position: "fixed", top: "max(env(safe-area-inset-top, 14px), 14px)", right: "max(20px, calc((100vw - 430px) / 2 + 20px))", zIndex: 3, transform: "scale(0.82)", transformOrigin: "top right" }}
      />

      <div style={{
        position: "relative", zIndex: 1, flex: 1, minHeight: 0,
        width: "100%", maxWidth: 430, margin: "0 auto",
        display: "flex", flexDirection: "column",
        padding: "calc(env(safe-area-inset-top, 24px) + 16px) 28px calc(env(safe-area-inset-bottom, 0px) * 0.6 + 10px)",
      }}>

        {/* ── Wordmark, top center — the photo carries the rest ── */}
        <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <Wordmark size={23} p={L} />
        </div>

        <div style={{ flex: 1, minHeight: 0 }} />

        {/* ── Title block, anchored to the form like the reference ── */}
        <div style={{ fontFamily: L.heading, fontWeight: 800, fontSize: 33, letterSpacing: "0.05em", textTransform: "uppercase", color: "#FFFFFF", lineHeight: 1.05 }}>
          {mode === "signup" ? t("Registracija") : t("Prijava")}
        </div>
        <p style={{ fontFamily: L.display, fontStyle: "italic", fontSize: 15.5, color: L.muted, margin: "7px 0 22px", lineHeight: 1.4 }}>
          {t("sistem, ki pozna vsakega športnika")}
        </p>

        {/* ── Email ── */}
        <div style={{ marginBottom: 18 }}>
          <span style={label}>{t("E-POŠTA")}</span>
          <input type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            onFocus={e => e.target.style.borderBottomColor = L.accent}
            onBlur={e => e.target.style.borderBottomColor = "rgba(255,255,255,0.30)"}
            placeholder="ime@email.com" autoComplete="email" style={inp} />
        </div>

        {/* ── Password ── */}
        <div style={{ marginBottom: 2, position: "relative" }}>
          <span style={label}>{t("GESLO")}</span>
          <input type={showPass ? "text" : "password"} value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            onFocus={e => e.target.style.borderBottomColor = L.accent}
            onBlur={e => e.target.style.borderBottomColor = "rgba(255,255,255,0.30)"}
            placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} style={{ ...inp, paddingRight: 40 }} />
          <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 0, bottom: 9, background: "none", border: "none", color: L.muted, cursor: "pointer", padding: 4, lineHeight: 0 }}>
            {showPass
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18.1 18.1 0 015.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18.1 18.1 0 01-2.14 2.86M1 1l22 22"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
        </div>

        {error && (
          <div style={{ color: "#FF8A75", fontSize: 14, marginTop: 12, fontFamily: L.display, padding: "10px 12px", borderRadius: 10, background: "rgba(201,90,63,0.14)", border: "1px solid rgba(201,90,63,0.4)" }}>
            {t(error)}
          </div>
        )}

        <button onClick={() => window.open(LANDING_URL, "_blank", "noopener,noreferrer")} style={{ alignSelf: "flex-end", background: "none", border: "none", color: L.muted, fontFamily: L.display, fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginTop: 10, padding: 0 }}>
          {t("Pozabljeno geslo?")}
        </button>

        {/* ── Primary CTA — solid brand green, like the reference ── */}
        <button onClick={submit} disabled={busy} style={{
          ...bigBtn, marginTop: 14, border: "none",
          background: L.accent, color: "#04130A",
          boxShadow: "0 12px 30px rgba(0,255,135,0.22)",
          opacity: busy ? 0.65 : 1,
        }}>
          {busy ? t("Počakaj…") : mode === "signup" ? t("Ustvari račun") : t("Vstopi")}
        </button>

        {/* ── Secondary — outlined glass, toggles login/signup ── */}
        <button onClick={() => { setMode(m => (m === "signup" ? "login" : "signup")); setError(""); }} style={{
          ...bigBtn, marginTop: 10,
          border: "1px solid rgba(255,255,255,0.32)", background: "rgba(255,255,255,0.05)",
          color: L.text, fontWeight: 600,
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        }}>
          {mode === "signup" ? t("Prijava") : t("Registracija")}
        </button>

        {/* ── Social ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 10px" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.16)" }} />
          <span style={{ ...label, fontSize: 10 }}>{t("ALI")}</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.16)" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <SocialBtn onClick={() => social("apple")} p={L}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Apple
          </SocialBtn>
          <SocialBtn onClick={() => social("google")} p={L}>
            <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </SocialBtn>
        </div>

        <button onClick={onPrivacy} style={{ background: "none", border: "none", color: L.muted2, fontFamily: L.display, fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginTop: 12, padding: 0, textAlign: "center", width: "100%" }}>
          {t("Politika zasebnosti")}
        </button>
      </div>
    </div>
  );
}
