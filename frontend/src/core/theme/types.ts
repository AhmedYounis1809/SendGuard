export type ThemeId = "sendguard" | "royal-navy-gold" | "charcoal-gold" | "amber-navy";

export interface ThemeSwatch {
  id: ThemeId;
  primary: string;
  secondary: string;
  neutral: string;
}
