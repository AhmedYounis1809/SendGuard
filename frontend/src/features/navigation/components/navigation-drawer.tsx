import { useI18n } from "../../../core/i18n";
import "./navigation-drawer.css";

export type AppView = "landing" | "verification" | "settings";

interface NavigationDrawerProps {
  open: boolean;
  view: AppView;
  onClose: () => void;
  onSelect: (view: AppView) => void;
}

export function NavigationDrawer({ open, view, onClose, onSelect }: NavigationDrawerProps) {
  const { t } = useI18n();

  const items: { key: AppView; label: string }[] = [
    { key: "landing", label: t("nav.home") },
    { key: "verification", label: t("nav.verify") },
    { key: "settings", label: t("nav.settings") },
  ];

  return (
    <>
      <div
        className={`nav-drawer__backdrop ${open ? "nav-drawer__backdrop--open" : ""}`}
        onClick={onClose}
      />
      <aside className={`nav-drawer ${open ? "nav-drawer--open" : ""}`} aria-hidden={!open}>
        <header className="nav-drawer__header">
          <span>{t("app.badge")}</span>
          <button
            type="button"
            className="nav-drawer__close"
            onClick={onClose}
            aria-label={t("nav.menu")}
          >
            ×
          </button>
        </header>

        <nav className="nav-drawer__list">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-drawer__item ${
                view === item.key ? "nav-drawer__item--active" : ""
              }`}
              aria-current={view === item.key}
              onClick={() => onSelect(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
