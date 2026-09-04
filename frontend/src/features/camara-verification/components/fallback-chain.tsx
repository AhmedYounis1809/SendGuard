import { useI18n } from "../../../core/i18n";
import {
  TIERS,
  isDegraded,
  tierStates,
  type TierState,
} from "../lib/agent-modes";
import {
  attributeFallbackReason,
  type ServiceFailure,
} from "../lib/fallback-reason";
import "./verification-flow.css";

interface FallbackChainProps {
  /** Mode for the signal-gathering stage (`agent_mode`). */
  investigationMode: string;
  /** Mode for the action-choice stage (`recommendation_mode`). */
  recommendationMode: string;
  fallbackReason?: string | null;
}

const STATE_GLYPH: Record<TierState, string> = {
  active: "●",
  failed: "✕",
  unused: "○",
  bypassed: "–",
};

function ChainRow({
  label,
  mode,
  stateTitle,
  failures,
  unattributedNote,
}: {
  label: string;
  mode: string;
  stateTitle: Record<TierState, string>;
  failures: ServiceFailure[];
  unattributedNote?: string;
}) {
  const { t } = useI18n();
  const states = tierStates(mode);

  return (
    <div className="fc-row">
      <span className="fc-row__label">{label}</span>
      <span className="fc-row__tiers">
        {TIERS.map((tier, index) => (
          <span key={tier.id} className="fc-tier-wrap">
            {index > 0 && (
              <span className="fc-arrow" aria-hidden="true">
                →
              </span>
            )}
            <span
              className={`fc-tier fc-tier--${states[tier.id]}`}
              title={`${tier.label}: ${stateTitle[states[tier.id]]}`}
            >
              <span className="fc-tier__glyph" aria-hidden="true">
                {STATE_GLYPH[states[tier.id]]}
              </span>
              {tier.label}
              <span className="ra-sr-only">
                {" — "}
                {stateTitle[states[tier.id]]}
              </span>
            </span>
          </span>
        ))}
      </span>

      {failures.map((failure, index) => (
        <p className="fc-row__reason" key={index}>
          {t(`fallbackChain.reason.causes.${failure.cause}`, {
            service: failure.service,
          })}
        </p>
      ))}

      {unattributedNote && <p className="fc-row__reason fc-row__reason--muted">{unattributedNote}</p>}
    </div>
  );
}

export function FallbackChain({
  investigationMode,
  recommendationMode,
  fallbackReason,
}: FallbackChainProps) {
  const { t } = useI18n();
  const degraded =
    isDegraded(investigationMode) || isDegraded(recommendationMode);

  const stateTitle: Record<TierState, string> = {
    active: t("fallbackChain.tierState.active"),
    failed: t("fallbackChain.tierState.failed"),
    unused: t("fallbackChain.tierState.unused"),
    bypassed: t("fallbackChain.tierState.bypassed"),
  };

  // Attributes the backend's single combined reason string to whichever
  // stage actually degraded, so the "why" sits right under the stage it
  // explains instead of one disconnected paragraph at the bottom.
  const attribution = attributeFallbackReason(
    investigationMode,
    recommendationMode,
    fallbackReason,
  );

  return (
    <div className={`fc ${degraded ? "fc--degraded" : ""}`}>
      <div className="fc__head">
        <span>{t("fallbackChain.title")}</span>
        <span className={`fc__badge ${degraded ? "fc__badge--degraded" : ""}`}>
          {degraded
            ? t("fallbackChain.status.degraded")
            : t("fallbackChain.status.nominal")}
        </span>
      </div>

      <ChainRow
        label={t("fallbackChain.stage.investigation")}
        mode={investigationMode}
        stateTitle={stateTitle}
        failures={attribution.investigation}
      />
      <ChainRow
        label={t("fallbackChain.stage.recommendation")}
        mode={recommendationMode}
        stateTitle={stateTitle}
        failures={attribution.recommendation}
        unattributedNote={
          attribution.recommendationReasonLost
            ? t("fallbackChain.reason.unattributed")
            : undefined
        }
      />
    </div>
  );
}
