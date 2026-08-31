import { useI18n, type Language } from "../../../core/i18n";
import { useTheme, THEMES } from "../../../core/theme";
import "./settings-page.css";

const LANGUAGES: Language[] = ["en", "ar"];

export function SettingsPage() {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <section className="settings-page">
      <div className="settings-page__intro">
        <h2>{t("settings.title")}</h2>
        <p>{t("settings.description")}</p>
      </div>

      <div className="settings-page__field">
        <span className="settings-page__label">{t("settings.languageLabel")}</span>
        <div
          className="settings-page__options"
          role="radiogroup"
          aria-label={t("settings.languageLabel")}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="radio"
              aria-checked={language === lang}
              className={`settings-page__option ${
                language === lang ? "settings-page__option--active" : ""
              }`}
              onClick={() => setLanguage(lang)}
            >
              {t(`settings.languages.${lang}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-page__field">
        <span className="settings-page__label">{t("settings.themeLabel")}</span>
        <div
          className="settings-page__theme-grid"
          role="radiogroup"
          aria-label={t("settings.themeLabel")}
        >
          {THEMES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              role="radio"
              aria-checked={theme === swatch.id}
              className={`settings-page__theme-card ${
                theme === swatch.id ? "settings-page__theme-card--active" : ""
              }`}
              onClick={() => setTheme(swatch.id)}
            >
              <span className="settings-page__theme-swatches">
                <span
                  className="settings-page__theme-dot"
                  style={{ background: swatch.secondary }}
                />
                <span
                  className="settings-page__theme-dot"
                  style={{ background: swatch.primary }}
                />
                <span
                  className="settings-page__theme-dot"
                  style={{ background: swatch.neutral }}
                />
              </span>
              <span className="settings-page__theme-text">
                <span className="settings-page__theme-name">
                  {t(`settings.themes.${swatch.id}.name`)}
                </span>
                <span className="settings-page__theme-desc">
                  {t(`settings.themes.${swatch.id}.description`)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
