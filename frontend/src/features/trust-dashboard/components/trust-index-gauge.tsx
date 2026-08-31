import { useI18n } from "../../../core/i18n";

interface TrustIndexGaugeProps {
  value: number;
}

function tierColor(value: number): string {
  if (value >= 80) return "var(--color-tertiary)";
  if (value >= 50) return "var(--color-primary)";
  if (value >= 25) return "var(--color-warning)";
  return "var(--color-danger)";
}

const ARC_PATH = "M20 100 A80 80 0 0 1 180 100";

export function TrustIndexGauge({ value }: TrustIndexGaugeProps) {
  const { t } = useI18n();
  const clamped = Math.max(0, Math.min(100, value));
  const color = tierColor(clamped);

  return (
    <div className="trust-gauge">
      <svg viewBox="0 0 200 110" className="trust-gauge__svg" aria-hidden="true">
        <path d={ARC_PATH} pathLength={100} className="trust-gauge__track" />
        <path
          d={ARC_PATH}
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - clamped}
          className="trust-gauge__value"
          style={{ stroke: color }}
        />
      </svg>
      <div className="trust-gauge__readout">
        <span className="trust-gauge__number" style={{ color }}>
          {Math.round(clamped)}
        </span>
        <span className="trust-gauge__label">{t("dashboard.trustIndexLabel")}</span>
      </div>
    </div>
  );
}
