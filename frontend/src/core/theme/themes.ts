import type { ThemeId, ThemeSwatch } from "./types";

/**
 * Preview swatches for the Settings picker. Hex values mirror the
 * `html[data-theme="..."]` blocks in index.css — the CSS is what actually
 * re-themes the app; this list only feeds the little color dots so a
 * theme's look is visible before switching to it.
 */
export const THEMES: ThemeSwatch[] = [
  { id: "sendguard", primary: "#14b8a6", secondary: "#0a1e2c", neutral: "#f8fafc" },
  { id: "royal-navy-gold", primary: "#d4af37", secondary: "#0d1b2a", neutral: "#f7f3e9" },
  { id: "charcoal-gold", primary: "#d1b26f", secondary: "#1c1c1e", neutral: "#f5f5f5" },
  { id: "violet-nightfall", primary: "#a855f7", secondary: "#1e1b4b", neutral: "#f5f3ff" },
  { id: "cyan-ember", primary: "#22d3ee", secondary: "#0f172a", neutral: "#ecfeff" },
  { id: "hanken-teal", primary: "#5eead4", secondary: "#0f172a", neutral: "#f0fdfa" },
  { id: "emerald-matrix", primary: "#10b981", secondary: "#022c22", neutral: "#ecfdf5" },
  { id: "solar-flare", primary: "#f59e0b", secondary: "#451a03", neutral: "#fffbeb" },
];

export const THEME_IDS: ThemeId[] = THEMES.map((theme) => theme.id);
