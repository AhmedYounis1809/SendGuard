import { useState } from "react";
import { VerificationConsole } from "./features/camara-verification";
import { SettingsPage } from "./features/settings";
import { useI18n } from "./core/i18n";
import "./App.css";

type View = "dashboard" | "settings";

function App() {
  const { t } = useI18n();
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="app-shell">
      <nav className="app-shell__nav">
        <button
          type="button"
          className="app-shell__nav-link"
          onClick={() => setView(view === "dashboard" ? "settings" : "dashboard")}
        >
          {view === "dashboard" ? t("nav.settings") : t("nav.back")}
        </button>
      </nav>

      <header className="app-shell__header">
        <span className="app-shell__badge">{t("app.badge")}</span>
        <h1>{t("app.title")}</h1>
        <p>{t("app.subtitle")}</p>
      </header>

      <main className="app-shell__main">
        {view === "dashboard" ? <VerificationConsole /> : <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
