import { useState } from "react";
import { VerificationDrawer } from "./features/camara-verification";
import { SettingsPage } from "./features/settings";
import { useI18n } from "./core/i18n";
import "./App.css";

type View = "landing" | "settings";

function App() {
  const { t } = useI18n();
  const [view, setView] = useState<View>("landing");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app-shell">
      <nav className="app-shell__nav">
        <button
          type="button"
          className="app-shell__nav-link"
          onClick={() => setDrawerOpen(true)}
        >
          {t("nav.verify")}
        </button>
        <button
          type="button"
          className="app-shell__nav-link"
          onClick={() => setView(view === "landing" ? "settings" : "landing")}
        >
          {view === "landing" ? t("nav.settings") : t("nav.back")}
        </button>
      </nav>

      <header className="app-shell__header">
        <span className="app-shell__badge">{t("app.badge")}</span>
        <h1>{t("app.title")}</h1>
        <p>{t("app.subtitle")}</p>
      </header>

      <main className="app-shell__main">
        {view === "landing" ? (
          <section className="landing">
            <p className="landing__line">{t("landing.problem")}</p>
            <p className="landing__line">{t("landing.solution")}</p>
            <button
              type="button"
              className="landing__cta"
              onClick={() => setDrawerOpen(true)}
            >
              {t("landing.ctaButton")}
            </button>
          </section>
        ) : (
          <SettingsPage />
        )}
      </main>

      <VerificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

export default App;
