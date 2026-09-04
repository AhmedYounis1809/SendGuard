import { useCallback, useState } from "react";
import { useI18n } from "../../../core/i18n";
import { AgentApiError, runAgentTest, type AgentTestResult, type AgentTransactionInput } from "../api/agent-test.api";
import { modeLabel, type AgentMode } from "../lib/agent-modes";
import { attributeFallbackReason, type ServiceFailure } from "../lib/fallback-reason";

export type ConsoleLineTone =
  | "default"
  | "success"
  | "error"
  | "header"
  | "step"
  | "muted"
  | "metric"
  | "rule";

/** Colors a metric's value in-line so a degraded engine is visible without
 * reading the explanation line below it. */
export type MetricValueTone = "warn" | "danger";

export interface ConsoleLine {
  id: number;
  text: string;
  tone: ConsoleLineTone;
  /** When set, the line renders as an aligned label/value row. */
  value?: string;
  valueTone?: MetricValueTone;
}

export type VerificationStatus = "idle" | "running" | "done" | "error";

const SIGNAL_STEPS: { tool: string; label: string }[] = [
  { tool: "check_sim_swap_tool", label: "SIM Swap" },
  { tool: "check_device_swap_tool", label: "Device Swap" },
  { tool: "check_location_tool", label: "Location Verification" },
];

function describeSignal(tool: string, data: Record<string, unknown> | undefined): string {
  if (!data) return "no data";
  if (data.degraded) return `error: ${data.error ?? "unknown"}`;
  if (tool === "check_location_tool") return `verificationResult=${data.verification_result}`;
  return `hours_since_swap=${data.hours_since_swap}`;
}

/** Deterministic-only-option is a normal policy outcome (see agent-modes.ts),
 * not a failure, so it stays the default color — only genuine fallbacks
 * are flagged. */
function engineValueTone(mode: AgentMode | string): MetricValueTone | undefined {
  if (mode === "AI_GROQ_FALLBACK") return "warn";
  if (mode === "DETERMINISTIC_FALLBACK") return "danger";
  return undefined;
}

function pushServiceFailures(
  push: (text: string, tone?: ConsoleLineTone) => void,
  t: (key: string, params?: Record<string, string | number>) => string,
  failures: ServiceFailure[],
) {
  for (const failure of failures) {
    push(
      t(`fallbackChain.reason.causes.${failure.cause}`, { service: failure.service }),
      "error",
    );
  }
}

export function useCamaraVerification() {
  const { t } = useI18n();
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [result, setResult] = useState<AgentTestResult | null>(null);

  // Derives the next id purely from `prev` — no external mutable counter —
  // so this stays safe under Strict Mode's double-invocation of state
  // updaters (a ref-based counter read here previously caused colliding
  // ids and "duplicate key" warnings under the double invoke).
  const pushLine = useCallback(
    (
      text: string,
      tone: ConsoleLineTone = "default",
      value?: string,
      valueTone?: MetricValueTone,
    ) => {
      setLines((prev) => [...prev, { id: prev.length + 1, text, tone, value, valueTone }]);
    },
    [],
  );

  const run = useCallback(async (payload: AgentTransactionInput) => {
    setLines([]);
    setResult(null);
    setStatus("running");

    pushLine("Gathering evidence", "header");

    let agentResult: AgentTestResult;
    try {
      agentResult = await runAgentTest(payload);
    } catch (error) {
      const message =
        error instanceof AgentApiError
          ? t(error.i18nKey, error.i18nParams)
          : error instanceof Error
            ? error.message
            : "Unexpected error";
      pushLine(message, "error");
      setStatus("error");
      return;
    }

    const attribution = attributeFallbackReason(
      agentResult.agent_mode,
      agentResult.recommendation_mode,
      agentResult.fallback_reason,
    );

    pushLine(
      "Investigation engine",
      "metric",
      modeLabel(agentResult.agent_mode),
      engineValueTone(agentResult.agent_mode),
    );
    pushServiceFailures(pushLine, t, attribution.investigation);

    const totalChecked = SIGNAL_STEPS.filter((s) =>
      agentResult.signals_checked.includes(s.tool),
    ).length;
    let stepNum = 0;

    for (const { tool, label } of SIGNAL_STEPS) {
      const wasChecked = agentResult.signals_checked.includes(tool);
      const wasSkipped = agentResult.signals_not_checked.includes(tool);

      if (wasChecked) {
        stepNum += 1;
        pushLine(`[${stepNum}/${totalChecked}] ${label}`, "step");
        const data = agentResult.raw_signals[tool];
        const degraded = Boolean(data?.degraded);
        const detail = describeSignal(tool, data);
        pushLine(detail, degraded ? "error" : "success");
      } else if (wasSkipped) {
        pushLine(`${label} — skipped (not needed for this transaction)`, "muted");
      }
    }

    pushLine("", "rule");
    pushLine("Decision", "header");

    pushLine("Trust Index", "metric", `${agentResult.trust_index}/100`);
    pushLine("Risk Tier", "metric", agentResult.tier);
    pushLine("Recommended Action", "metric", agentResult.action);
    pushLine(
      "Decision engine",
      "metric",
      modeLabel(agentResult.recommendation_mode),
      engineValueTone(agentResult.recommendation_mode),
    );
    pushServiceFailures(pushLine, t, attribution.recommendation);
    if (attribution.recommendationReasonLost) {
      pushLine(t("fallbackChain.reason.unattributed"), "muted");
    }

    pushLine("", "rule");
    pushLine("Reasoning", "header");
    for (const reason of agentResult.reasons) {
      pushLine(reason, "default");
    }

    setResult(agentResult);
    setStatus("done");
  }, [pushLine, t]);

  return { lines, status, result, run };
}
