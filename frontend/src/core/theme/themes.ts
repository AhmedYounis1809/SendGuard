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
  { id: "amber-navy", primary: "#fca311", secondary: "#000000", neutral: "#ffffff" },
];

export const THEME_IDS: ThemeId[] = THEMES.map((theme) => theme.id);
