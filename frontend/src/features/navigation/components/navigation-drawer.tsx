import type { ReactNode } from "react";
import { useI18n } from "../../../core/i18n";
import "./navigation-drawer.css";

export type AppView = "landing" | "verification" | "settings";

interface NavigationDrawerProps {
  open: boolean;
  view: AppView;
  onClose: () => void;
  onSelect: (view: AppView) => void;
}

const ICONS: Record<AppView, ReactNode> = {
  landing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  verification: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 3.5 5 6v5.5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-2.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1.04-1.56V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1.04H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

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
          <div className="nav-drawer__brand">
            <img className="nav-drawer__logo" src="/assets/images/logo.png" alt="" />
            <span>{t("app.badge")}</span>
          </div>
          <button
            type="button"
            className="nav-drawer__close"
            onClick={onClose}
            aria-label={t("nav.close")}
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
              <span className="nav-drawer__item-icon">{ICONS[item.key]}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
