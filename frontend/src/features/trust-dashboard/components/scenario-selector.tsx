import { useI18n } from "../../../core/i18n";
import type { ScenarioId } from "../types/trust-dashboard.types";

interface ScenarioSelectorProps {
  active: ScenarioId | null;
  disabled: boolean;
  onSelect: (scenario: ScenarioId) => void;
}

const SCENARIOS: ScenarioId[] = ["legitimate", "false_positive", "suspicious", "high_risk"];

export function ScenarioSelector({ active, disabled, onSelect }: ScenarioSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="scenario-selector" role="radiogroup" aria-label={t("dashboard.title")}>
      {SCENARIOS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={active === id}
          className={`scenario-selector__item ${
            active === id ? "scenario-selector__item--active" : ""
          }`}
          disabled={disabled}
          onClick={() => onSelect(id)}
        >
          <span className="scenario-selector__name">{t(`dashboard.scenarios.${id}`)}</span>
          <span className="scenario-selector__desc">{t(`dashboard.scenarioDescriptions.${id}`)}</span>
        </button>
      ))}
    </div>
  );
}
