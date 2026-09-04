import { useI18n } from "../../../core/i18n";
import { useCamaraVerification } from "../hooks/use-camara-verification";
import type { AgentTransactionInput } from "../api/agent-test.api";
import { AgentConsole } from "./agent-console";
import { FallbackChain } from "./fallback-chain";
import "./verification-flow.css";

interface VerificationConsoleProps {
  payload: AgentTransactionInput;
}

export function VerificationConsole({ payload }: VerificationConsoleProps) {
  const { t } = useI18n();

  const { lines, status, result, run } = useCamaraVerification();

  const isRunning = status === "running";

  const handleRun = () => {
    run(payload);
  };

  const statusLabel =
    status === "running"
      ? t("verification.runningButton")
      : status === "done"
        ? t("verification.statusDone")
        : status === "error"
          ? t("verification.statusError")
          : "Idle";

  const recentTxCount = payload.recent_transaction_count_10min;

  return (
    <div className="ra-card">
      <div className="ra-layout">
        <div>
          <div className="ra-card__header">
            <div>
              <div className="ra-card__heading">
                <h2>{t("verification.title")}</h2>
                <span className="ra-stage">Stage 2</span>
              </div>
              <p className="ra-card__desc">{t("verification.description")}</p>
            </div>

            <button
              type="button"
              className="ra-btn"
              onClick={handleRun}
              disabled={isRunning}
            >
              {isRunning
                ? t("verification.runningButton")
                : t("verification.runButton")}
            </button>
          </div>

          <AgentConsole
            lines={lines}
            status={status}
            statusLabel={statusLabel}
            placeholder={t("verification.placeholder")}
            tall
          />
        </div>

        <aside className="ra-panel">
          <div className="ra-panel__title">
            <span>Payload Manifest</span>
            <span className="ra-panel__target">{payload.phone_number}</span>
          </div>

          <div className="ra-stat-grid">
            <div className="ra-stat">
              <span className="ra-stat__label">Amount</span>
              <span className="ra-stat__value">
                {payload.amount.toLocaleString()} {payload.currency}
              </span>
            </div>
            <div className="ra-stat">
              <span className="ra-stat__label">Velocity (10m)</span>
              <span className="ra-stat__value">
                {recentTxCount} event{recentTxCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="ra-stat">
              <span className="ra-stat__label">Recipient</span>
              <span
                className={`ra-stat__value ${
                  payload.is_new_beneficiary
                    ? "ra-stat__value--warn"
                    : "ra-stat__value--safe"
                }`}
              >
                {payload.is_new_beneficiary
                  ? "New Beneficiary"
                  : "Known Beneficiary"}
              </span>
            </div>
            <div className="ra-stat">
              <span className="ra-stat__label">Device</span>
              <span
                className={`ra-stat__value ${
                  payload.trusted_device_available
                    ? "ra-stat__value--safe"
                    : "ra-stat__value--warn"
                }`}
              >
                {payload.trusted_device_available
                  ? "Trusted Device"
                  : "Untrusted Device"}
              </span>
            </div>
          </div>

          <div className="ra-checklist">
            <div className="ra-checklist__head">
              <span>Geographic Reference</span>
            </div>
            <div className="ra-checklist__item">
              <span>Usual Latitude</span>
              <span className="ra-checklist__status">
                {payload.usual_latitude ?? "—"}
              </span>
            </div>
            <div className="ra-checklist__item">
              <span>Usual Longitude</span>
              <span className="ra-checklist__status">
                {payload.usual_longitude ?? "—"}
              </span>
            </div>
            <div className="ra-checklist__item">
              <span>Location Reference</span>
              <span className="ra-checklist__status">
                {payload.location_reference_available
                  ? "Available"
                  : "Unavailable"}
              </span>
            </div>
          </div>

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
  );
}
