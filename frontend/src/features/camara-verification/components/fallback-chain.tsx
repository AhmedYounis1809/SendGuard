import {
  TIERS,
  isDegraded,
  tierStates,
  type TierState,
} from "../lib/agent-modes";
import "./verification-flow.css";

interface FallbackChainProps {
  /** Mode for the signal-gathering stage (`agent_mode`). */
  investigationMode: string;
  /** Mode for the action-choice stage (`recommendation_mode`). */
  recommendationMode: string;
  /**
   * The backend collapses both stages' reasons into one field
   * (`investigation_fallback_reason or recommendation_fallback_reason`),
   * so this is shown once for the whole chain rather than per stage.
   */
  fallbackReason?: string | null;
}

const STATE_GLYPH: Record<TierState, string> = {
  active: "●",
  failed: "✕",
  unused: "○",
  bypassed: "–",
};

const STATE_TITLE: Record<TierState, string> = {
  active: "produced the result",
  failed: "failed — chain moved on",
  unused: "not reached",
  bypassed: "skipped by policy",
};

function ChainRow({ label, mode }: { label: string; mode: string }) {
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
              title={`${tier.label}: ${STATE_TITLE[states[tier.id]]}`}
            >
              <span className="fc-tier__glyph" aria-hidden="true">
                {STATE_GLYPH[states[tier.id]]}
              </span>
              {tier.label}
              <span className="ra-sr-only">
                {" — "}
                {STATE_TITLE[states[tier.id]]}
              </span>
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}

export function FallbackChain({
  investigationMode,
  recommendationMode,
  fallbackReason,
}: FallbackChainProps) {
  const degraded =
    isDegraded(investigationMode) || isDegraded(recommendationMode);

  return (
    <div className={`fc ${degraded ? "fc--degraded" : ""}`}>
      <div className="fc__head">
        <span>Engine Resilience</span>
        <span className={`fc__badge ${degraded ? "fc__badge--degraded" : ""}`}>
          {degraded ? "Degraded" : "Nominal"}
        </span>
      </div>

      <ChainRow label="Investigation" mode={investigationMode} />
      <ChainRow label="Recommendation" mode={recommendationMode} />

      {fallbackReason && (
        <p className="fc__reason" title={fallbackReason}>
          {fallbackReason}
        </p>
      )}
    </div>
  );
}
