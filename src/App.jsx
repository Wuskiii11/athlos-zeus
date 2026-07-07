import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { ThemeContext, THEMES, DatePickerContext, TimePickerContext } from "./theme";
import { Mono, TabButton, SkeletonBlock } from "./components/UI";
import DatePicker from "./components/DatePicker";
import TimePicker from "./components/TimePicker";
import ScreenToday from "./screens/ScreenToday";
import ScreenTrain from "./screens/ScreenTrain";
import ScreenSession from "./screens/ScreenSession";
import ScreenAI from "./screens/ScreenAI";
import ScreenReport from "./screens/ScreenReport";
import ScreenProfile from "./screens/ScreenProfile";
import ScreenSeason from "./screens/ScreenSeason";
import ScreenFuel from "./screens/ScreenFuel";
import ScreenSettings from "./screens/ScreenSettings";
import ScreenAccount from "./screens/ScreenAccount";
import ScreenPrivacy from "./screens/ScreenPrivacy";
import ScreenChat from "./screens/ScreenChat";
import ScreenClub from "./screens/ScreenClub";
import ScreenAssessment from "./screens/ScreenAssessment";
import LoginScreen from "./screens/LoginScreen";
import SetupFlow from "./screens/SetupFlow";
import ConsentScreen from "./screens/ConsentScreen";
import { getSession, onAuthChange, signOut as apiSignOut, loadProfile, saveProfile, getAthleteClub } from "./lib/api";
import { countUnreadChats } from "./lib/notifications";
import { LangContext, makeT } from "./lib/i18n";
import CoachApp from "./coach/CoachApp";
import LiveTrainingBar from "./screens/widgets/LiveTrainingBar";

const NAV = [
  { id: "today",    label: "Danes",   icon: "today" },
  { id: "season",   label: "Koledar", icon: "calendar" },
  { id: "ai",       label: "AI",      icon: "ai" },
  { id: "chat",     label: "Chat",    icon: "chat" },
  { id: "settings", label: "Profil",  icon: "profile" },
];

function SplashScreen() {
  // One artwork for both themes: green-on-black Zeus statue, frameless, on a
  // pure black field — cover fills the screen edge to edge.
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000609",
      zIndex: 999, overflow: "hidden",
    }}>
      <style>{`
        @keyframes splashGod { from { opacity: 0; } to { opacity: 1; } }
        /* The app-wide reduced-motion reset forces animation-duration to ~0
           via !important; this one-time fade wins it back, scoped here only. */
        .athlos-splash-god { animation: splashGod 0.55s ease-out forwards !important; }
      `}</style>
      <img
        className="athlos-splash-god"
        src="/img/splash-zeus.png"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}

// Detect the device platform once at module load — never changes after load.
const getPlatform = () => {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
};
const PLATFORM = getPlatform();

// The phone's own light/dark preference — used as the default until the user
// makes an explicit choice (Settings or their saved account theme).
const getSystemTheme = () =>
  (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark" : "light";

// Device-level prefs (theme, consent). Auth + profile live in lib/api (key athlos:v1).
const PREFS_KEY = "athlos:prefs";
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const cleanProfile = (o) =>
  Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => v != null && k !== "id" && k !== "updated_at"));

// Brand default is the light "Parian marble" (Greco-Roman) look — the app no
// longer follows the OS theme, so dark devices don't hide the marble design.
// Dark stays available as an explicit choice in Settings.

export default function AthlosApp() {
  const [splash, setSplash]           = useState(true);
  // Refresh keeps you on the same tab (per-tab memory; a fresh app start
  // still opens on "today")
  const [screen, setScreen]           = useState(() => {
    try { return sessionStorage.getItem("athlos:screen") || "today"; } catch { return "today"; }
  });
  useEffect(() => { try { sessionStorage.setItem("athlos:screen", screen); } catch {} }, [screen]);
  const [navDir, setNavDir]           = useState(null); // "next" | "prev" | null — drives the slide direction
  // Follow the phone's light/dark preference by default; an explicit Settings /
  // account choice overrides it and sticks.
  const [theme, setThemeState]        = useState(() => loadPrefs().themePref || getSystemTheme());
  const themeExplicit                 = useRef(!!loadPrefs().themePref);
  // Persist the theme both on-device (prefs) and on the account (profile.theme),
  // so it follows the user across logins/devices.
  const setTheme = (val) => { themeExplicit.current = true; setThemeState(val); setProfile((p) => ({ ...p, theme: val })); };
  const C = THEMES[theme];
  const [consented, setConsented]     = useState(() => !!loadPrefs().consented);
  const [registered, setRegistered]   = useState(false);
  const [needsSetup, setNeedsSetup]   = useState(false);
  const [profile, setProfile]         = useState(() => ({ name: "NIK", sport: "Nogomet", photo: null, lang: loadPrefs().lang || "sl", role: "athlete" }));
  const lang = profile.lang === "en" ? "en" : "sl";
  const [user, setUser]               = useState(null);
  const [chatUnread, setChatUnread]   = useState(0); // conversations with unread messages → nav dot + home bell
  const [chatConvOpen, setChatConvOpen] = useState(false); // full-screen chat subview open → hide the bottom nav
  const [kbOpen, setKbOpen]           = useState(false); // a text field is focused (keyboard up) → slide the nav away
  const [authReady, setAuthReady]     = useState(false);
  const [reminder, setReminder]       = useState(null);
  const [dp, setDp]                   = useState(null);
  const [tp, setTp]                   = useState(null);
  const [pullDist, setPullDist]       = useState(0);
  const [refreshing, setRefreshing]   = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0); // bump → remount current screen (soft refresh, no full reload/splash)
  // Privacy policy is a dismissable popup, not a navigation target — reachable
  // from Login, Settings, or Consent regardless of which screen is active.
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const touchStartY  = useRef(0);
  const touchStartX  = useRef(0);
  const touchCurX    = useRef(0);
  const touchCurY    = useRef(0);
  const swipeBlocked = useRef(false);
  const scrollRef    = useRef(null);
  const scrollPos    = useRef({}); // per-screen scroll memory, so back returns where you were
  const profileLoaded = useRef(false);
  const shellRef     = useRef(null);

  // Apply an auth session: load the user's profile and route to setup or app.
  const applySession = async (session) => {
    if (session && session.user) {
      setUser(session.user);
      let prof = null;
      try { prof = await loadProfile(session.user.id); } catch {}
      if (prof && (prof.name || prof.sport || prof.birth || prof.role === "coach")) {
        setProfile((p) => ({ ...p, ...cleanProfile(prof) }));
        // Restore the account's saved theme.
        if (prof.theme === "dark" || prof.theme === "light") { themeExplicit.current = true; setThemeState(prof.theme); }
        profileLoaded.current = true;
        setNeedsSetup(false);
        setRegistered(true);
        getAthleteClub(session.user.id).then((club) => { if (club) setProfile((p) => ({ ...p, club })); }).catch(() => {});
      } else {
        // Logged in but profile not completed yet → finish setup
        profileLoaded.current = false;
        setRegistered(false);
        setNeedsSetup(true);
      }
    } else {
      setUser(null);
      profileLoaded.current = false;
      setRegistered(false);
      setNeedsSetup(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  // Check for an existing session on load (refresh keeps you logged in).
  // Sign-IN is driven by LoginScreen (after the launch animation) — the auth
  // listener only reacts to sign-OUT (e.g. session expired in another tab),
  // otherwise it would yank the screen away mid-animation.
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await applySession(await getSession()); } catch {}
      finally { setAuthReady(true); }
      unsub = onAuthChange((session) => { if (!session) applySession(null); });
    })();
    return () => unsub();
    // eslint-disable-next-line
  }, []);

  // Persist device prefs (theme, consent) locally
  useEffect(() => {
    // Persist the theme only once the user has explicitly chosen it in Settings,
    // so everyone else stays on the brand-default light marble.
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ themePref: themeExplicit.current ? theme : undefined, consented, lang })); } catch {}
  }, [theme, consented, lang]);

  // Auto-save profile edits to the backend (only after the profile is loaded
  // for the logged-in user, so we never overwrite the stored profile with defaults)
  useEffect(() => {
    if (!profileLoaded.current || !user) return;
    saveProfile(user.id, profile).catch(() => {});
  }, [profile, user]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // iOS standalone viewport fix (VERIFIED on-device): an installed PWA
  // under-reports the layout viewport by the status-bar height (e.g. innerHeight
  // 793 on an 852pt screen), so every top/bottom-anchored layer ended ~59pt
  // early — the permanent empty band at the bottom. CSS can't reach past the
  // lying viewport, so when standalone under-reports, force the shell to the
  // physical screen height via JS.
  useEffect(() => {
    const el = shellRef.current;
    const standalone = window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    const apply = () => {
      if (!el) return;
      if (standalone && window.screen && window.innerHeight < window.screen.height) {
        el.style.height = window.screen.height + "px";
        el.style.bottom = "auto";
      } else {
        el.style.height = "";
        el.style.bottom = "0";
      }
    };
    apply();
    const t = setTimeout(apply, 600); // some iOS versions settle the viewport late
    window.addEventListener("resize", apply);
    window.visualViewport && window.visualViewport.addEventListener("resize", apply);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", apply);
      window.visualViewport && window.visualViewport.removeEventListener("resize", apply);
    };
  }, []);

  // Live-follow the phone's light/dark preference — but only while the user
  // hasn't made an explicit choice (that choice always wins).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => { if (!themeExplicit.current) setThemeState(e.matches ? "dark" : "light"); };
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange); };
  }, []);

  // Slide the floating nav away while a text field is focused (keyboard up)
  // and bring it back on blur. The focusout check is deferred a tick because
  // focus hopping between two fields fires out→in back-to-back.
  useEffect(() => {
    const editable = (el) => !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    let timer;
    const onFocusIn = (e) => { if (editable(e.target)) { clearTimeout(timer); setKbOpen(true); } };
    const onFocusOut = (e) => {
      if (!editable(e.target)) return;
      clearTimeout(timer);
      timer = setTimeout(() => { if (!editable(document.activeElement)) setKbOpen(false); }, 80);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const navActive = ["train","session","report","fuel"].includes(screen) ? "today"
    : ["profile","account"].includes(screen) ? "settings"
    : screen;

  const go = (s) => {
    // Remember where we were on the current screen, so returning restores it.
    if (scrollRef.current) scrollPos.current[screen] = scrollRef.current.scrollTop;
    const ids = NAV.map(n => n.id);
    const from = ids.indexOf(screen), to = ids.indexOf(s);
    setNavDir(from !== -1 && to !== -1 && from !== to ? (to > from ? "next" : "prev") : null);
    setScreen(s);
  };

  // Restore the saved scroll position after a screen change (the scroll node is
  // re-keyed per screen, so it mounts at 0 — put it back where the user was).
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollPos.current[screen] || 0;
    // eslint-disable-next-line
  }, [screen]);

  // Unread-chat badge: re-checked on every screen change (opening a
  // conversation marks it read on-device) and every 30 s while running.
  useEffect(() => {
    if (!user) { setChatUnread(0); return; }
    let live = true;
    const check = () => countUnreadChats(user.id).then((n) => { if (live) setChatUnread(n); }).catch(() => {});
    check();
    const iv = setInterval(check, 30000);
    return () => { live = false; clearInterval(iv); };
  }, [user, screen]);

  const tabIds = NAV.map(n => n.id);

  const onTouchStart = (e) => {
    touchStartY.current = touchCurY.current = e.touches[0].clientY;
    touchStartX.current = touchCurX.current = e.touches[0].clientX;
    // Don't hijack horizontal drags that belong to a control (sliders, inputs).
    swipeBlocked.current = !!(e.target.closest && e.target.closest("input, textarea, [data-noswipe]"));
  };
  const onTouchMove  = (e) => {
    touchCurX.current = e.touches[0].clientX;
    touchCurY.current = e.touches[0].clientY;
    const dx = touchCurX.current - touchStartX.current;
    const dy = touchCurY.current - touchStartY.current;
    // Horizontal gesture → don't also trigger pull-to-refresh.
    if (Math.abs(dx) > Math.abs(dy)) { if (pullDist) setPullDist(0); return; }
    // No pull-to-refresh on the AI/ZEUS chat — a refresh would remount it and
    // wipe the ongoing conversation. (Tab-swipe still works, handled above.)
    if (screen === "ai") return;
    if (!scrollRef.current || scrollRef.current.scrollTop > 2) return;
    if (dy > 0) setPullDist(Math.min(dy * 0.45, 64));
  };
  const onTouchEnd   = () => {
    const dx = touchCurX.current - touchStartX.current;
    const dy = touchCurY.current - touchStartY.current;
    // Left/right swipe → move to the previous/next tab (only on a top-level tab screen).
    if (!swipeBlocked.current && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      const idx = tabIds.indexOf(screen);
      if (idx !== -1) {
        const next = idx + (dx < 0 ? 1 : -1);
        if (next >= 0 && next < tabIds.length) { setPullDist(0); go(tabIds[next]); return; }
      }
    }
    if (pullDist > 44 && !refreshing) {
      // Soft refresh: remount the current screen so it re-fetches its data —
      // stays on the same tab, no full page reload (which would flash the splash).
      setRefreshing(true);
      setPullDist(0);
      // Clear navDir so the refresh remount fades in place instead of replaying
      // the last tab-slide animation (which made Koledar slide sideways on refresh).
      setNavDir(null);
      setTimeout(() => { setNavDir(null); setRefreshNonce(n => n + 1); setRefreshing(false); }, 500);
    } else {
      setPullDist(0);
    }
  };

  const todayWorkout = { title: "Moč · spodnji del", time: "17:00" };
  const fireReminder = (w) => setReminder(w);

  useEffect(() => {
    const check = () => {
      const [h, m] = todayWorkout.time.split(":").map(Number);
      const now = new Date(), start = new Date();
      start.setHours(h, m, 0, 0);
      const mins = (start - now) / 60000;
      if (mins <= 60 && mins > 59 && !reminder) fireReminder(todayWorkout);
    };
    const iv = setInterval(check, 30000);
    check();
    return () => clearInterval(iv);
    // eslint-disable-next-line
  }, [reminder]);

  const render = () => {
    switch (screen) {
      case "today":    return <ScreenToday go={go} profile={profile} chatUnread={chatUnread} />;
      case "train":    return <ScreenTrain go={go} user={user} />;
      case "session":  return <ScreenSession go={go} />;
      case "ai":       return <ScreenAI user={user} profile={profile} />;
      case "report":   return <ScreenReport go={go} />;
      case "profile":  return <ScreenProfile go={go} profile={profile} setProfile={setProfile} />;
      case "fuel":     return <ScreenFuel go={go} profile={profile} />;
      case "settings": return <ScreenSettings profile={profile} setProfile={setProfile} user={user} theme={theme} setTheme={setTheme} onPrivacy={() => setPrivacyOpen(true)} onAccount={() => setScreen("account")} onLogout={() => { profileLoaded.current = false; setUser(null); setRegistered(false); setNeedsSetup(false); setConsented(false); setProfile((p) => ({ ...p, role: "athlete" })); setScreen("today"); apiSignOut().catch(() => {}); }} />;
      case "account":  return <ScreenAccount profile={profile} setProfile={setProfile} user={user} onBack={() => setScreen("settings")} />;
      case "season":   return <ScreenSeason go={go} profile={profile} user={user} />;
      case "chat":       return <ScreenChat user={user} profile={profile} onConvOpenChange={setChatConvOpen} />;
      case "club":       return <ScreenClub go={go} profile={profile} />;
      case "assessment": return <ScreenAssessment go={go} profile={profile} />;
      default:         return <ScreenToday go={go} profile={profile} />;
    }
  };

  const globalStyles = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root { height: 100%; margin: 0; padding: 0; overscroll-behavior: none; overflow-x: hidden; background: ${C.bg}; }
    body { -webkit-font-smoothing: antialiased; background: ${C.bg}; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }

    /* True full-screen: size against the phone shell (fixed top:0/bottom:0 — the
       only reliably full-height box). NO viewport units here: an explicit
       100vh/100dvh height OVERRIDES the bottom:0 anchor (CSS ignores bottom when
       top+height are set), and iOS under-reports dvh in both Safari and installed
       PWAs — that was the permanent empty band at the bottom of every screen. */
    .app-fullscreen { height: 100%; }
    button { font-family: inherit; }
    input, textarea { font-family: inherit; }
    ::selection { background: rgba(22,104,179,0.22); }

    @keyframes athlosFade {
      from { opacity: 0; transform: translateY(8px) scale(0.99); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes athlosSlideNext {
      from { opacity: 0; transform: translateX(56px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes athlosShimmer {
      from        { transform: translateX(-60px); }
      55%, 100%   { transform: translateX(460px); }
    }
    @keyframes athlosMsgUser {
      from { opacity: 0; transform: translate(18px, 6px) scale(0.98); }
      to   { opacity: 1; transform: translate(0, 0) scale(1); }
    }
    @keyframes athlosMsgBot {
      from { opacity: 0; transform: translate(-18px, 6px) scale(0.98); }
      to   { opacity: 1; transform: translate(0, 0) scale(1); }
    }
    @keyframes athlosSlidePrev {
      from { opacity: 0; transform: translateX(-56px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes athlosScreen {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes athlosRise {
      0%   { opacity: 0; transform: translateY(24px) scale(0.97); }
      60%  { opacity: 1; }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes athlosSlideDown {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes athlosPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.6; transform: scale(0.85); }
    }
    @keyframes athlosDot {
      0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
      30%            { opacity: 1;   transform: translateY(-4px); }
    }
    @keyframes spinCW {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .athlos-scroll::-webkit-scrollbar { display: none; }
    .athlos-scroll { -ms-overflow-style: none; scrollbar-width: none; scroll-behavior: smooth; }

    /* Prevent iOS zoom on input focus — must be font-size >= 16px */
    input, textarea, select { font-size: 16px !important; touch-action: manipulation; }

    /* Prevent double-tap zoom on buttons */
    button { touch-action: manipulation; }

    /* iOS-specific */
    [data-platform="ios"] .athlos-scroll { -webkit-overflow-scrolling: touch; }
    [data-platform="ios"] input, [data-platform="ios"] textarea { caret-color: ${C.accent}; }

    /* Android-specific */
    [data-platform="android"] body { font-feature-settings: "kern" 1; }
    [data-platform="android"] .athlos-scroll { scroll-behavior: smooth; }

    /* Respect reduced-motion preferences (a11y) */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;

  const t = makeT(lang);

  return (
    <ThemeContext.Provider value={C}>
    <LangContext.Provider value={lang}>
    <DatePickerContext.Provider value={setDp}>
    <TimePickerContext.Provider value={setTp}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet" />
      {/* Android status bar color matches app background */}
      {PLATFORM === "android" && <meta name="theme-color" content={C.bg} />}
      <style>{globalStyles}</style>

      {/* Phone shell — centers the app at a phone-like width on wide (desktop) screens.
          The transform makes this the containing block for descendant position:fixed
          screens, so they fill the shell instead of the full browser window. */}
      <div ref={shellRef} data-platform={PLATFORM} style={{
        position: "fixed", top: 0, bottom: 0, left: "50%",
        width: "min(100%, 430px)",
        transform: "translateX(-50%)",
        overflow: "hidden",
        boxShadow: "0 0 60px rgba(0,0,0,0.35)",
      }}>

      {/* ── SPLASH ── (stays up until the auth session is resolved) */}
      {(splash || !authReady) && <SplashScreen />}

      {/* ── LOGIN ── */}
      {!splash && authReady && !registered && !needsSetup && (
        <LoginScreen profile={profile} setProfile={setProfile} theme={theme} onLogin={(u) => applySession({ user: u })} onPrivacy={() => setPrivacyOpen(true)} />
      )}

      {/* ── SETUP ── */}
      {!splash && authReady && needsSetup && (
        <SetupFlow profile={profile} setProfile={setProfile} onBack={() => {
          // Back from step 0 → return to the login screen
          profileLoaded.current = false;
          setUser(null);
          setRegistered(false);
          setNeedsSetup(false);
          apiSignOut().catch(() => {});
        }} onDone={(info) => {
          const np = {
            ...profile, name: info.username, birth: info.birth, height: info.height, weight: info.weight, sport: info.sport || profile.sport,
            // extended onboarding (spec §01)
            acquisition: info.acquisition, gender: info.gender, waist: info.waist, bodyFat: info.bodyFat,
            goals: info.goals, experience: info.experience, injuries: info.injuries, injuryNote: info.injuryNote, equipment: info.equipment,
          };
          setProfile(np);
          if (user) saveProfile(user.id, np).catch(() => {});
          profileLoaded.current = true;
          setNeedsSetup(false);
          setRegistered(true);
        }} />
      )}

      {/* ── COACH APP ── (role "coach" → separate coach experience, bypasses athlete setup/consent) */}
      {!splash && registered && !needsSetup && profile.role === "coach" && (
        <CoachApp
          lang={profile.lang === "en" ? "en" : "sl"}
          onLangChange={(l) => setProfile((p) => ({ ...p, lang: l }))}
          onLogout={() => {
            // Reset the UI to the login screen FIRST so logout is instant even if
            // the Supabase sign-out network call is slow; revoke the session after.
            profileLoaded.current = false;
            setUser(null);
            setRegistered(false);
            setNeedsSetup(false);
            setConsented(false);
            setProfile((p) => ({ ...p, role: "athlete" }));
            setScreen("today");
            apiSignOut().catch(() => {});
          }}
        />
      )}

      {/* ── CONSENT ── (athlete) */}
      {!splash && registered && !needsSetup && profile.role !== "coach" && !consented && (
        <ConsentScreen onAccept={() => setConsented(true)} onReject={() => setConsented(true)} />
      )}

      {/* ── MAIN APP ── (athlete) */}
      {!splash && registered && !needsSetup && profile.role !== "coach" && consented && (
        <div className="app-fullscreen" style={{
          // anchor top AND bottom so the app fills the whole phone shell — without
          // `bottom` it only got 100dvh, leaving the cut-off strip at the bottom
          position: "fixed", inset: 0,
          width: "100%",
          background: C.bg,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          isolation: "isolate",
        }}>
          {/* Soft marble gradient backdrop */}
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            backgroundColor: C.bg,
            backgroundImage: C.bgImage,
          }} />
          {/* Antique printed-paper halftone — very faint, app-wide */}
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(rgba(28,24,20,0.05) 0.8px, transparent 1.2px)",
            backgroundSize: "5px 5px", mixBlendMode: "multiply", opacity: C.name === "dark" ? 0.18 : 0.08,
          }} />

          {/* Safe area top spacer */}
          <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0, position: "relative", zIndex: 1 }} />


          {/* Reminder banner */}
          {reminder && (
            <div style={{ margin: "0 14px 6px", padding: "12px 14px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, animation: "athlosSlideDown 0.3s ease", flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 14.5, color: C.text }}>Trening čez 1 uro</div>
                <Mono style={{ color: C.muted, fontSize: 10 }}>{reminder.title} · {reminder.time}</Mono>
              </div>
              <button onClick={() => setReminder(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 22.5, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Pull-to-refresh */}
          {(pullDist > 0 || refreshing) && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: Math.max(pullDist, refreshing ? 40 : 0), overflow: "hidden", transition: "height 0.2s", flexShrink: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${C.accent}`, borderTopColor: "transparent", animation: "spinCW 0.7s linear infinite", opacity: refreshing ? 1 : pullDist / 64 }} />
            </div>
          )}

          {/* Screen content — full height, padded bottom so content clears the floating nav */}
          <div
            ref={scrollRef}
            key={`${screen}:${refreshNonce}`}
            className="athlos-scroll"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              flex: 1, overflowY: "auto", overflowX: "hidden",
              width: "100%",
              // clearance for the floating nav — released while typing, so
              // bottom-anchored bars (ZEUS composer, chat input) sit flush
              // against the keyboard with nothing under them
              paddingBottom: kbOpen ? "6px" : "calc(80px + env(safe-area-inset-bottom, 12px))",
              transition: "padding-bottom 0.32s cubic-bezier(.22,1,.36,1)",
              animation: navDir === "next" ? "athlosSlideNext 0.26s cubic-bezier(0.22,1,0.36,1)"
                : navDir === "prev" ? "athlosSlidePrev 0.26s cubic-bezier(0.22,1,0.36,1)"
                : "athlosFade 0.22s ease",
              position: "relative",
            }}
          >
            {render()}
          </div>

          {/* Tab bar — truly floating pill, absolutely positioned.
              Hidden while a full-screen chat subview (open conversation,
              new chat) is up, so it can't cover the message input. */}
          {!(screen === "chat" && chatConvOpen) && <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0, zIndex: 2,
            padding: "8px 16px",
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 10px), 12px)",
            // no solid backdrop here — real glass needs the app content to show
            // THROUGH the bar (blurred), so nothing opaque may sit behind it
            pointerEvents: "none",
            // typing → the pill slides off below the screen; blur → it glides back
            transform: kbOpen ? "translateY(130%)" : "translateY(0)",
            opacity: kbOpen ? 0 : 1,
            transition: "transform 0.32s cubic-bezier(.22,1,.36,1), opacity 0.25s ease",
          }}>
            {/* Live training widget (spec §07) — sticky across tabs while a workout runs */}
            {screen !== "train" && <LiveTrainingBar C={C} t={t} onOpen={() => go("train")} />}

            {/* compact icon-only liquid-glass pill — a light-catching translucent
                material: heavy blur+saturation, lit top rim, and a diagonal sheen */}
            <nav style={{
              display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
              width: "fit-content", marginInline: "auto",
              padding: "6px 10px",
              position: "relative", overflow: "hidden",
              background: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.32)",
              backdropFilter: "blur(28px) saturate(200%)",
              WebkitBackdropFilter: "blur(28px) saturate(200%)",
              borderRadius: 999,
              border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.65)"}`,
              boxShadow: theme === "dark"
                // outer lift + lit top rim + faint bottom edge = glass slab
                ? "0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(255,255,255,0.07)"
                : "0 12px 36px rgba(28,24,20,0.16), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.3), 0 0 0 1px rgba(28,24,20,0.04)",
              pointerEvents: "auto",
            }}>
              {/* diagonal light sheen across the glass */}
              <span aria-hidden="true" style={{
                position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none",
                background: theme === "dark"
                  ? "linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 38%, transparent 55%, rgba(255,255,255,0.05) 100%)"
                  : "linear-gradient(115deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 40%, transparent 58%, rgba(255,255,255,0.2) 100%)",
              }} />
              {NAV.map(n => {
                const active = navActive === n.id;
                return <TabButton key={n.id} n={{ ...n, label: t(n.label) }} active={active} onClick={() => go(n.id)} dot={n.id === "chat" && chatUnread > 0} />;
              })}
            </nav>
          </div>}

          {/* Pickers */}
          {dp && <DatePicker value={dp.value} onChange={v => { dp.onChange(v); setDp(null); }} onClose={() => setDp(null)} futureDays={dp.futureDays} />}
          {tp && <TimePicker value={tp.value} onChange={v => { tp.onChange(v); setTp(null); }} onClose={() => setTp(null)} />}
        </div>
      )}

      {/* Privacy policy — a dismissable popup reachable from Login or Settings,
          not a navigation target, so it works regardless of the current screen. */}
      {privacyOpen && <ScreenPrivacy onClose={() => setPrivacyOpen(false)} />}

      </div>
    </TimePickerContext.Provider>
    </DatePickerContext.Provider>
    </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
