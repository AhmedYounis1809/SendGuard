import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../../core/i18n";
import { useScenarioRunner } from "../hooks/use-scenario-runner";
import { AgentConsole } from "../../camara-verification/components/agent-console";
import { FallbackChain } from "../../camara-verification/components/fallback-chain";
import { DEMO_SCENARIOS } from "../data/demo-scenarios";
import type { DemoScenario, ScenarioCategory } from "../types/trust-dashboard.types";
import { TrustIndexGauge } from "./trust-index-gauge";
import "../../camara-verification/components/verification-flow.css";
import "./dashboard-view.css";

const DECISION_MODIFIER: Record<string, string> = {
  ALLOW: "allow",
  ADAPTIVE_VERIFICATION: "adaptive",
  TRANSACTION_HOLD: "hold",
  TEMPORARY_FREEZE: "freeze",
};

type SnackbarTone = "info" | "allow" | "adaptive" | "hold" | "freeze" | "error";

interface SnackbarState {
  tone: SnackbarTone;
  message: string;
}

type FilterId = "all" | ScenarioCategory;

// High recent-transaction velocity is the one receipt field worth calling
// out on the card itself — everything else the risk chip already frames.
const VELOCITY_SPIKE_THRESHOLD = 3;

export function DashboardView() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterId>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { lines, status, result, run } = useScenarioRunner();
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [resultVisible, setResultVisible] = useState(true);
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const prevStatusRef = useRef(status);

  const isRunning = status === "running";

  const decisionTier = result?.tier ?? null;
  const decisionModifier = decisionTier ? (DECISION_MODIFIER[decisionTier] as SnackbarTone) : null;

  // Track whether the live-decision panel is actually on screen so we can
  // nudge the user with a snackbar if they scroll away while it's running.
  useEffect(() => {
    const el = resultRef.current;
    if (!el) {
      setResultVisible(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setResultVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeId]);

  useEffect(() => {
    if (isRunning && !resultVisible) {
      setSnackbar({ tone: "info", message: t("dashboard.snackbar.stillSimulating") });
    } else if (isRunning && resultVisible) {
      setSnackbar((prev) => (prev?.tone === "info" ? null : prev));
    }
  }, [isRunning, resultVisible, t]);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prevStatus === status) return;

    if (status === "done" && decisionModifier && decisionTier) {
      setSnackbar({
        tone: decisionModifier,
        message: t("dashboard.snackbar.decisionReady", {
          decision: t(`dashboard.decisions.${decisionTier}`),
        }),
      });
      const timer = setTimeout(() => setSnackbar(null), 5000);
      return () => clearTimeout(timer);
    }

    if (status === "error") {
      setSnackbar({ tone: "error", message: t("dashboard.snackbar.simulationFailed") });
      const timer = setTimeout(() => setSnackbar(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status, decisionModifier, decisionTier, t]);

  const visibleScenarios = useMemo(
    () =>
      filter === "all"
        ? DEMO_SCENARIOS
        : DEMO_SCENARIOS.filter((s) => s.category === filter),
    [filter],
  );

  const FILTERS: { id: FilterId; label: string }[] = [
    { id: "all", label: t("dashboard.filters.all", { count: DEMO_SCENARIOS.length }) },
    { id: "routine", label: t("dashboard.filters.routine") },
    { id: "friction", label: t("dashboard.filters.friction") },
    { id: "suspicious", label: t("dashboard.filters.suspicious") },
  ];

  const handleRun = (scenario: DemoScenario) => {
    setActiveId(scenario.id);
    run(scenario);
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeId) ?? null;

  return (
    <div className="dashboard-view">
      <div className="dash-header">
        <div className="dash-header__title-row">
          <h1>{t("dashboard.title")}</h1>
          <span className="dash-header__count">
            {t("dashboard.scenariosCount", { count: DEMO_SCENARIOS.length })}
          </span>
        </div>
        <p className="dash-header__desc">{t("dashboard.description")}</p>

        <div className="dash-filters" role="tablist" aria-label={t("dashboard.filterAriaLabel")}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`dash-filter ${filter === f.id ? "dash-filter--active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="receipt-grid">
        {visibleScenarios.map((scenario) => {
          const isSpiking =
            scenario.payload.recent_transaction_count_10min >= VELOCITY_SPIKE_THRESHOLD;
          const text = (field: string) => t(`dashboard.scenarios.${scenario.id}.${field}`);

          return (
            <div
              key={scenario.id}
              className={`receipt-card ${
                activeId === scenario.id ? "receipt-card--active" : ""
              }`}
            >
              <div className="receipt-card__head">
                <span className="receipt-card__title">{text("label")}</span>
                <span className="receipt-card__amount">
                  {scenario.payload.amount.toLocaleString()} {scenario.payload.currency}
                </span>
              </div>

              <span className={`risk-chip risk-chip--${scenario.riskTier}`}>
                {scenario.riskTier === "critical" && <span className="risk-chip__dot" />}
                {text("riskLabel")}
              </span>

              <p className="receipt-card__summary">{text("summary")}</p>

              <div className="receipt-card__rows" dir="ltr">
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.sender")}</span>
                  <span>{text("senderName")}</span>
                </div>
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.phone")}</span>
                  <span>{scenario.sender.phone}</span>
                </div>
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.recipient")}</span>
                  <span>{text("recipientName")}</span>
                </div>
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.phone")}</span>
                  <span>{scenario.recipient.phone}</span>
                </div>
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.beneficiary")}</span>
                  <span
                    className={
                      scenario.payload.is_new_beneficiary
                        ? "receipt-card__value--warn"
                        : "receipt-card__value--safe"
                    }
                  >
                    {scenario.payload.is_new_beneficiary
                      ? t("dashboard.values.new")
                      : t("dashboard.values.existing")}
                  </span>
                </div>
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.recentTx")}</span>
                  <span className={isSpiking ? "receipt-card__value--danger" : undefined}>
                    {t("dashboard.values.inLast10Min", {
                      count: scenario.payload.recent_transaction_count_10min,
                    })}
                  </span>
                </div>
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.location")}</span>
                  <span
                    className={
                      scenario.payload.location_reference_available
                        ? undefined
                        : "receipt-card__value--muted"
                    }
                  >
                    {text("locationLabel")}
                  </span>
                </div>
                <div className="receipt-card__row">
                  <span>{t("dashboard.fields.device")}</span>
                  <span
                    className={
                      scenario.payload.trusted_device_available
                        ? "receipt-card__value--safe"
                        : "receipt-card__value--warn"
                    }
                  >
                    {scenario.payload.trusted_device_available
                      ? t("dashboard.values.trusted")
                      : t("dashboard.values.untrusted")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="receipt-card__run-btn"
                disabled={isRunning}
                onClick={() => handleRun(scenario)}
              >
                {isRunning && activeId === scenario.id
                  ? t("dashboard.simulatingButton")
                  : t("dashboard.simulateButton")}
              </button>
            </div>
          );
        })}
      </div>

      {!activeScenario && (
        <p className="dashboard-view__placeholder">{t("dashboard.placeholder")}</p>
      )}

      {activeScenario && (
        <div className="ra-card" ref={resultRef}>
          <div className="ra-layout">
            <div>
              <div className="ra-card__header">
                <div>
                  <div className="ra-card__heading">
                    <h2>{t(`dashboard.scenarios.${activeScenario.id}.label`)}</h2>
                    <span className="ra-stage">{t("dashboard.liveAgentBadge")}</span>
                  </div>
                  <p className="ra-card__desc">
                    {t(`dashboard.scenarios.${activeScenario.id}.summary`)}
                  </p>
                </div>
              </div>

              <AgentConsole lines={lines} status={status} tall />
            </div>

            <aside className="ra-panel">
              <div className="ra-panel__title">
                <span>{t("dashboard.liveDecisionTitle")}</span>
              </div>

              <TrustIndexGauge value={result?.trust_index ?? 0} />

              {decisionTier && decisionModifier && (
                <span
                  className={`dash-pill dash-pill--${decisionModifier}`}
                >
                  {decisionModifier === "allow" && (
                    <span className="dash-pill__check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {t(`dashboard.decisions.${decisionTier}`)}
                </span>
              )}

              {result && result.reasons.length > 0 && (
                <div className="ra-checklist">
                  <div className="ra-checklist__head">
                    <span>{t("dashboard.reasonsTitle")}</span>
                  </div>
                  {result.reasons.map((reason, index) => (
                    <div className="ra-checklist__item" key={index}>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {result && (
                <FallbackChain
                  investigationMode={result.agent_mode}
                  recommendationMode={result.recommendation_mode}
                  fallbackReason={result.fallback_reason}
                />
              )}
            </aside>
          </div>
        </div>
      )}

      {snackbar && (
        <div className={`snackbar snackbar--${snackbar.tone}`} role="status">
          {snackbar.tone === "allow" && (
            <span className="snackbar__check" aria-hidden="true">
              <span className="snackbar__check-ring" />
              <span className="snackbar__check-ring" />
              ✓
            </span>
          )}
          <span>{snackbar.message}</span>
          {snackbar.tone === "info" ? (
            <button
              type="button"
              className="snackbar__action"
              onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {t("dashboard.snackbar.viewAction")}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="snackbar__action"
                onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {t("dashboard.snackbar.viewAction")}
              </button>
              <button
                type="button"
                className="snackbar__close"
                aria-label={t("dashboard.snackbar.dismissAriaLabel")}
                onClick={() => setSnackbar(null)}
              >
                ×
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
