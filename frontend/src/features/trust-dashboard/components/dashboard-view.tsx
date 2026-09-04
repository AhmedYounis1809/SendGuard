import { useMemo, useState } from "react";
import { useI18n } from "../../../core/i18n";
import { env } from "../../../core/config/env";
import { useCamaraVerification } from "../../camara-verification/hooks/use-camara-verification";
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

type FilterId = "all" | ScenarioCategory;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: `All Scenarios (${DEMO_SCENARIOS.length})` },
  { id: "routine", label: "Low Risk / Routine" },
  { id: "friction", label: "Elevated Friction" },
  { id: "suspicious", label: "High-Risk Suspicious" },
];

// High recent-transaction velocity is the one receipt field worth calling
// out on the card itself — everything else the risk chip already frames.
const VELOCITY_SPIKE_THRESHOLD = 3;

export function DashboardView() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterId>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { lines, status, result, run } = useCamaraVerification();

  const isRunning = status === "running";

  const visibleScenarios = useMemo(
    () =>
      filter === "all"
        ? DEMO_SCENARIOS
        : DEMO_SCENARIOS.filter((s) => s.category === filter),
    [filter],
  );

  const handleRun = (scenario: DemoScenario) => {
    setActiveId(scenario.id);
    // The card displays the demo sender/recipient phone numbers for the
    // story, but the agent is always called with the real CAMARA
    // simulator number — that's the only number with live signal data.
    run({
      ...scenario.payload,
      phone_number: env.defaultPhoneNumber,
    });
  };

  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeId) ?? null;

  const decisionTier = result?.tier ?? null;
  const decisionModifier = decisionTier ? DECISION_MODIFIER[decisionTier] : null;

  return (
    <div className="dashboard-view">
      <div className="dash-header">
        <div className="dash-header__title-row">
          <h1>{t("dashboard.title")}</h1>
          <span className="dash-header__count">{DEMO_SCENARIOS.length} Scenarios</span>
        </div>
        <p className="dash-header__desc">{t("dashboard.description")}</p>

        <div className="dash-filters" role="tablist" aria-label="Filter scenarios by risk category">
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

          return (
            <div
              key={scenario.id}
              className={`receipt-card ${
                activeId === scenario.id ? "receipt-card--active" : ""
              }`}
            >
              <div className="receipt-card__head">
                <span className="receipt-card__title">{scenario.label}</span>
                <span className="receipt-card__amount">
                  {scenario.payload.amount.toLocaleString()} {scenario.payload.currency}
                </span>
              </div>

              <span className={`risk-chip risk-chip--${scenario.riskTier}`}>
                {scenario.riskTier === "critical" && <span className="risk-chip__dot" />}
                {scenario.riskLabel}
              </span>

              <p className="receipt-card__summary">{scenario.summary}</p>

              <div className="receipt-card__rows" dir="ltr">
                <div className="receipt-card__row">
                  <span>Sender</span>
                  <span>{scenario.sender.name}</span>
                </div>
                <div className="receipt-card__row">
                  <span>Phone</span>
                  <span>{scenario.sender.phone}</span>
                </div>
                <div className="receipt-card__row">
                  <span>Recipient</span>
                  <span>{scenario.recipient.name}</span>
                </div>
                <div className="receipt-card__row">
                  <span>Phone</span>
                  <span>{scenario.recipient.phone}</span>
                </div>
                <div className="receipt-card__row">
                  <span>Beneficiary</span>
                  <span
                    className={
                      scenario.payload.is_new_beneficiary
                        ? "receipt-card__value--warn"
                        : "receipt-card__value--safe"
                    }
                  >
                    {scenario.payload.is_new_beneficiary ? "New" : "Existing"}
                  </span>
                </div>
                <div className="receipt-card__row">
                  <span>Recent Tx</span>
                  <span className={isSpiking ? "receipt-card__value--danger" : undefined}>
                    {scenario.payload.recent_transaction_count_10min} in 10 min
                  </span>
                </div>
                <div className="receipt-card__row">
                  <span>Location</span>
                  <span
                    className={
                      scenario.payload.location_reference_available
                        ? undefined
                        : "receipt-card__value--muted"
                    }
                  >
                    {scenario.locationLabel}
                  </span>
                </div>
                <div className="receipt-card__row">
                  <span>Device</span>
                  <span
                    className={
                      scenario.payload.trusted_device_available
                        ? "receipt-card__value--safe"
                        : "receipt-card__value--warn"
                    }
                  >
                    {scenario.payload.trusted_device_available ? "Trusted" : "Untrusted"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="receipt-card__run-btn"
                disabled={isRunning}
                onClick={() => handleRun(scenario)}
              >
                {isRunning && activeId === scenario.id ? "Simulating…" : "Simulate Scenario →"}
              </button>
            </div>
          );
        })}
      </div>

      {!activeScenario && (
        <p className="dashboard-view__placeholder">{t("dashboard.placeholder")}</p>
      )}

      {activeScenario && (
        <div className="ra-card">
          <div className="ra-layout">
            <div>
              <div className="ra-card__header">
                <div>
                  <div className="ra-card__heading">
                    <h2>{activeScenario.label}</h2>
                    <span className="ra-stage">Live Agent</span>
                  </div>
                  <p className="ra-card__desc">{activeScenario.summary}</p>
                  <p className="ra-card__note">
                    Verifying number: {env.defaultPhoneNumber}
                  </p>
                </div>
              </div>

              <AgentConsole lines={lines} status={status} tall />
            </div>

            <aside className="ra-panel">
              <div className="ra-panel__title">
                <span>Live Decision</span>
              </div>

              <TrustIndexGauge value={result?.trust_index ?? 0} />

              {decisionTier && decisionModifier && (
                <span
                  className={`dash-pill dash-pill--${decisionModifier}`}
                >
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
    </div>
  );
}
