export type ThemeId =
  | "sendguard"
  | "royal-navy-gold"
  | "charcoal-gold"
  | "violet-nightfall"
  | "cyan-ember"
  | "hanken-teal"
  | "emerald-matrix"
  | "solar-flare";

export interface ThemeSwatch {
  id: ThemeId;
  primary: string;
  secondary: string;
  neutral: string;
}
