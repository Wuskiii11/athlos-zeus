import React from "react";

// ─────────────────────────────────────────────────────────────
// ATHLOS — "Marble" (Greco-Roman) theme.
// Warm marble surfaces, bronze/gold ornament, ink-black text, with
// the brand's electric green (#00FF87) kept as a sparing signal —
// bold on dark "oracle" panels (ZEUS / AI), restrained as classical
// laurel green on light marble. Cinzel (engraved caps) for headings,
// Cormorant Garamond for body/quotes/numerals, Barlow Condensed for
// big display labels, JetBrains Mono for data.
// ─────────────────────────────────────────────────────────────

export const FONTS = {
  // body / UI
  display: "'Cormorant Garamond',Georgia,'Times New Roman',serif",
  // headings — engraved caps
  heading: "'Cinzel',Georgia,'Times New Roman',serif",
  // accent / numerals / quotes
  serif: "'Cormorant Garamond',Georgia,'Times New Roman',serif",
  // condensed display labels
  cond: "'Barlow Condensed','Arial Narrow',sans-serif",
  // data / numerals — monospace kept for data fidelity
  mono: "'JetBrains Mono','IBM Plex Mono',ui-monospace,Menlo,monospace",
};

export const THEMES = {
  // ── DARK — "Obsidian": true black marble, electric-green signal carries
  // everything the bronze does in daylight ──
  dark: {
    name: "dark",
    bg: "#0A0A09",
    bgImage:
      "radial-gradient(130% 55% at 50% -14%, rgba(0,255,135,0.10) 0%, transparent 52%), linear-gradient(180deg, #131312 0%, #0A0A09 52%, #050505 100%)",
    btn: "#E8FFF2",
    btnText: "#091A0D",
    surface: "rgba(255,255,255,0.045)",
    surface2: "rgba(255,255,255,0.075)",
    surface3: "rgba(255,255,255,0.11)",
    border: "rgba(255,255,255,0.09)",
    border2: "rgba(255,255,255,0.18)",
    text: "#F2F5F2",
    text2: "rgba(242,245,242,0.80)",
    muted: "rgba(242,245,242,0.52)",
    muted2: "rgba(242,245,242,0.34)",
    accent: "#00FF87",
    accent2: "#33FFA3",
    gold: "#33FFA3",
    gold2: "#00FF87",
    red: "#C95A3F",
    yellow: "#33FFA3",
    // oracle-panel ambiance
    glow: "0 0 32px rgba(0,255,135,0.36)",
    glowSoft: "0 0 18px rgba(0,255,135,0.20)",
    ambient: "rgba(0,255,135,0.10)",
    grid: "rgba(0,255,135,0.03)",
    ...FONTS,
  },

  // ── LIGHT (default / hero) — "Parian marble": warm cream + bronze + classical laurel ──
  light: {
    name: "light",
    bg: "#FAF7F0",
    bgImage:
      "radial-gradient(ellipse 60% 30% at 20% 8%, rgba(216,207,189,0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 25%, rgba(216,207,189,0.18), transparent 55%), linear-gradient(180deg, #FDFBF7 0%, #F8F4EC 100%)",
    btn: "#1C1814",
    btnText: "#F4EFE6",
    surface: "#FCF9F2",
    surface2: "#FFFFFF",
    surface3: "#FFFFFF",
    border: "rgba(28,24,20,0.12)",
    border2: "rgba(28,24,20,0.20)",
    text: "#1C1814",
    text2: "rgba(28,24,20,0.78)",
    muted: "rgba(28,24,20,0.52)",
    muted2: "rgba(28,24,20,0.34)",
    // in daylight everything signals in bronze/gold — the battery's color
    accent: "#B08D57",
    accent2: "#C8A24A",
    gold: "#B08D57",
    gold2: "#C8A24A",
    red: "#B1452F",
    yellow: "#B08D57",
    // restrained marble glow
    glow: "0 10px 30px rgba(176,141,87,0.24)",
    glowSoft: "0 6px 18px rgba(176,141,87,0.15)",
    ambient: "rgba(176,141,87,0.10)",
    grid: "rgba(28,24,20,0.04)",
    ...FONTS,
  },
};

export const ThemeContext = React.createContext(THEMES.light);
export const useTheme = () => React.useContext(ThemeContext);

export const DatePickerContext = React.createContext(null);
export const useDatePicker = () => React.useContext(DatePickerContext);

export const TimePickerContext = React.createContext(null);
export const useTimePicker = () => React.useContext(TimePickerContext);

// Wordmark/emblem now drawn as a themed SVG (Greek column + lightning),
// so we drop the old raster logo and let the SVG fallback render.
export const LOGO = "";

export const LANDING_URL = "https://athl-os.com/";
