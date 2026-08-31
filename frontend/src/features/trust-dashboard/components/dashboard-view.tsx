import { useI18n } from "../../../core/i18n";
import { useTrustDashboard } from "../hooks/use-trust-dashboard";
import { ScenarioSelector } from "./scenario-selector";
import { SignalPanel } from "./signal-panel";
import { TrustIndexGauge } from "./trust-index-gauge";
import { DecisionCard } from "./decision-card";
import "./dashboard-view.css";

export function DashboardView() {
  const { t } = useI18n();
  const { scenario, status, result, revealedCount, verifying, recovered, run, verify } = useTrustDashboard();

  const isRunning = status === "running" || status === "revealing";

  return (
    <div className="dashboard-view">
      <div className="dashboard-view__intro">
        <h2>{t("dashboard.title")}</h2>
        <p>{t("dashboard.description")}</p>
      </div>

      <ScenarioSelector active={scenario} disabled={isRunning} onSelect={run} />

      {status === "idle" && <p className="dashboard-view__placeholder">{t("dashboard.placeholder")}</p>}

      {result && (
        <div className="dashboard-view__result">
          <SignalPanel signals={result.signals} revealedCount={status === "running" ? 0 : revealedCount} />
          <TrustIndexGauge value={status === "done" ? result.trust_index : 0} />
          {status === "done" && (
            <DecisionCard
              decision={result.decision}
              reasons={result.reasons}
              onVerify={verify}
              verifying={verifying}
              recovered={recovered}
            />
          )}
        </div>
      )}
    </div>
  );
}
