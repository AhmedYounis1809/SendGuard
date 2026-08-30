import { useI18n, type Language } from "../../../core/i18n";
import "./settings-page.css";

const LANGUAGES: Language[] = ["en", "ar"];

export function SettingsPage() {
  const { language, setLanguage, t } = useI18n();

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
    </section>
  );
}
