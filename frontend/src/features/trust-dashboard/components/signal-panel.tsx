import { useI18n } from "../../../core/i18n";
import type { SignalId, TransactionSignals } from "../types/trust-dashboard.types";

interface SignalPanelProps {
  signals: TransactionSignals;
  revealedCount: number;
}

const SIGNAL_IDS: SignalId[] = ["number_verification", "sim_swap", "device_swap", "location_verification"];

function isPass(id: SignalId, signals: TransactionSignals): boolean {
  switch (id) {
    case "number_verification":
      return signals.number_verification.verified;
    case "sim_swap":
      return !signals.sim_swap.swapped_recently;
    case "device_swap":
      return !signals.device_swap.swapped_recently;
    case "location_verification":
      return signals.location_verification.verified;
  }
}

export function SignalPanel({ signals, revealedCount }: SignalPanelProps) {
  const { t } = useI18n();

  return (
    <div className="signal-panel">
      {SIGNAL_IDS.map((id, index) => {
        const revealed = index < revealedCount;
        const pass = revealed && isPass(id, signals);
        const fail = revealed && !pass;

        let detail = t("dashboard.signalStatus.pending");
        if (revealed) {
          if (id === "number_verification") {
            detail = pass
              ? t("dashboard.signalDetails.numberVerified")
              : t("dashboard.signalDetails.numberNotVerified");
          } else if (id === "sim_swap" || id === "device_swap") {
            const swap = signals[id];
            detail = pass
              ? t("dashboard.signalDetails.noRecentSwap")
              : t("dashboard.signalDetails.recentSwap", { hours: swap.hours_since_swap ?? 0 });
          } else {
            detail = pass
              ? t("dashboard.signalDetails.locationNormal")
              : t("dashboard.signalDetails.locationUnusual");
          }
        }

        return (
          <div
            key={id}
            className={`signal-card ${revealed ? "signal-card--revealed" : ""} ${
              pass ? "signal-card--pass" : ""
            } ${fail ? "signal-card--fail" : ""}`}
          >
            <div className="signal-card__top">
              <span className="signal-card__name">{t(`dashboard.signals.${id}`)}</span>
              <span className="signal-card__badge">
                {revealed
                  ? pass
                    ? t("dashboard.signalStatus.pass")
                    : t("dashboard.signalStatus.fail")
                  : t("dashboard.signalStatus.pending")}
              </span>
            </div>
            <p className="signal-card__detail">{detail}</p>
          </div>
        );
      })}
    </div>
  );
}
