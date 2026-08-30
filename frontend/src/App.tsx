import { useState } from "react";
import { VerificationView } from "./features/camara-verification";
import { SettingsPage } from "./features/settings";
import { NavigationDrawer, type AppView } from "./features/navigation";
import { useI18n } from "./core/i18n";
import "./App.css";

function App() {
  const { t } = useI18n();
  const [view, setView] = useState<AppView>("landing");
  const [navOpen, setNavOpen] = useState(false);

  const handleSelect = (nextView: AppView) => {
    setView(nextView);
    setNavOpen(false);
  };

  return (
    <div className="app-shell">
      <nav className="app-shell__nav">
        <button
          type="button"
          className="app-shell__menu-btn"
          onClick={() => setNavOpen(true)}
          aria-label={t("nav.menu")}
        >
          ☰
        </button>
      </nav>

      <header className="app-shell__header">
        <span className="app-shell__badge">{t("app.badge")}</span>
        <h1>{t("app.title")}</h1>
        <p>{t("app.subtitle")}</p>
      </header>

      <main className="app-shell__main">
        {view === "landing" && (
          <section className="landing">
            <p className="landing__line">{t("landing.problem")}</p>
            <p className="landing__line">{t("landing.solution")}</p>
            <button
              type="button"
              className="landing__cta"
              onClick={() => setView("verification")}
            >
              {t("landing.ctaButton")}
            </button>
          </section>
        )}
        {view === "verification" && <VerificationView />}
        {view === "settings" && <SettingsPage />}
      </main>

      <NavigationDrawer
        open={navOpen}
        view={view}
        onClose={() => setNavOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  );
}

export default App;
