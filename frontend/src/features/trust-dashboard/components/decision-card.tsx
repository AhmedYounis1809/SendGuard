import { useI18n } from "../../../core/i18n";
import type { Decision, ReasonEntry } from "../types/trust-dashboard.types";

interface DecisionCardProps {
  decision: Decision;
  reasons: ReasonEntry[];
  onVerify: () => void;
  verifying: boolean;
  recovered: boolean;
}

const DECISION_MODIFIER: Record<Decision, string> = {
  ALLOW: "allow",
  ADAPTIVE_VERIFICATION: "adaptive",
  TRANSACTION_HOLD: "hold",
  TEMPORARY_FREEZE: "freeze",
};

export function DecisionCard({ decision, reasons, onVerify, verifying, recovered }: DecisionCardProps) {
  const { t } = useI18n();
  const canVerify = decision === "ADAPTIVE_VERIFICATION" && !recovered;

  return (
    <div className="decision-card decision-card--reveal">
      <span className={`decision-card__pill decision-card__pill--${DECISION_MODIFIER[decision]}`}>
        {t(`dashboard.decisions.${decision}`)}
      </span>

      <div className="decision-card__reasons">
        <span className="decision-card__reasons-title">{t("dashboard.reasonsTitle")}</span>
        <ul>
          {reasons.map((reason, index) => (
            <li key={`${reason.key}-${index}`}>{t(`dashboard.reasons.${reason.key}`, reason.params)}</li>
          ))}
        </ul>
      </div>

      {canVerify && (
        <button type="button" className="decision-card__verify-btn" onClick={onVerify} disabled={verifying}>
          {verifying ? t("dashboard.verifyingButton") : t("dashboard.verifyButton")}
        </button>
      )}
    </div>
  );
}
