import { useI18n } from "../../../core/i18n";
import { useCamaraVerification } from "../hooks/use-camara-verification";
import type { AgentTransactionInput } from "../api/agent-test.api";
import { AgentConsole } from "./agent-console";
import { FallbackChain } from "./fallback-chain";
import "./verification-flow.css";

interface VerificationConsoleProps {
  payload: AgentTransactionInput;
  onBack?: () => void;
}

export function VerificationConsole({
  payload,
  onBack,
}: VerificationConsoleProps) {
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
          : t("verification.statusIdle");

  const recentTxCount = payload.recent_transaction_count_10min;

  return (
    <div className="ra-card">
      <div className="ra-layout">
        <div>
          <div className="ra-card__header">
            <div>
              <div className="ra-card__heading">
                <h2>{t("verification.title")}</h2>
                <span className="ra-stage">{t("common.stage2")}</span>
              </div>
              <p className="ra-card__desc">{t("verification.description")}</p>
            </div>

            <div className="ra-footer__actions">
              {onBack && (
                <button
                  type="button"
                  className="ra-btn ra-btn--ghost"
                  onClick={onBack}
                >
                  {t("phoneStep.backButton")}
                </button>
              )}
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
            <span>{t("verification.payloadManifestTitle")}</span>
            <span className="ra-panel__target">{payload.phone_number}</span>
          </div>

          <div className="ra-stat-grid">
            <div className="ra-stat">
              <span className="ra-stat__label">{t("verification.stats.amount")}</span>
              <span className="ra-stat__value">
                {payload.amount.toLocaleString()} {payload.currency}
              </span>
            </div>
            <div className="ra-stat">
              <span className="ra-stat__label">{t("verification.stats.velocity")}</span>
              <span className="ra-stat__value">
                {recentTxCount}{" "}
                {recentTxCount === 1
                  ? t("verification.stats.event")
                  : t("verification.stats.events")}
              </span>
            </div>
            <div className="ra-stat">
              <span className="ra-stat__label">{t("verification.stats.recipient")}</span>
              <span
                className={`ra-stat__value ${
                  payload.is_new_beneficiary
                    ? "ra-stat__value--warn"
                    : "ra-stat__value--safe"
                }`}
              >
                {payload.is_new_beneficiary
                  ? t("verification.stats.newBeneficiary")
                  : t("verification.stats.knownBeneficiary")}
              </span>
            </div>
            <div className="ra-stat">
              <span className="ra-stat__label">{t("verification.stats.device")}</span>
              <span
                className={`ra-stat__value ${
                  payload.trusted_device_available
                    ? "ra-stat__value--safe"
                    : "ra-stat__value--warn"
                }`}
              >
                {payload.trusted_device_available
                  ? t("verification.stats.trustedDevice")
                  : t("verification.stats.untrustedDevice")}
              </span>
            </div>
          </div>

          <div className="ra-checklist">
            <div className="ra-checklist__head">
              <span>{t("verification.geoReferenceTitle")}</span>
            </div>
            <div className="ra-checklist__item">
              <span>{t("verification.usualLatitude")}</span>
              <span className="ra-checklist__status">
                {payload.usual_latitude ?? "—"}
              </span>
            </div>
            <div className="ra-checklist__item">
              <span>{t("verification.usualLongitude")}</span>
              <span className="ra-checklist__status">
                {payload.usual_longitude ?? "—"}
              </span>
            </div>
            <div className="ra-checklist__item">
              <span>{t("verification.locationReferenceLabel")}</span>
              <span className="ra-checklist__status">
                {payload.location_reference_available
                  ? t("verification.available")
                  : t("verification.unavailable")}
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
