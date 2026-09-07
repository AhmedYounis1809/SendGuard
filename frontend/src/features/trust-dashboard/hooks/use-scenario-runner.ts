import { useCallback, useState } from "react";
import { useI18n } from "../../../core/i18n";
import { runScenario } from "../api/scenario.api";
import type { AgentTestResult } from "../../../core/network/agent-types";
import type { DemoScenario } from "../types/trust-dashboard.types";
// Read-only reuse of camara-verification's display utilities — these are
// pure functions (mode string in, label/attribution out), not touched or
// modified. Nothing here calls camara-verification's API or hook.
import { modeLabel, type AgentMode } from "../../camara-verification/lib/agent-modes";
import { attributeFallbackReason, type ServiceFailure } from "../../camara-verification/lib/fallback-reason";

export type ConsoleLineTone = "default" | "success" | "error" | "header" | "step" | "muted" | "metric" | "rule";
export type MetricValueTone = "warn" | "danger";

export interface ConsoleLine {
  id: number;
  text: string;
  tone: ConsoleLineTone;
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
    push(t(`fallbackChain.reason.causes.${failure.cause}`, { service: failure.service }), "error");
  }
}

export function useScenarioRunner() {
  const { t } = useI18n();
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [result, setResult] = useState<AgentTestResult | null>(null);

  const pushLine = useCallback(
    (text: string, tone: ConsoleLineTone = "default", value?: string, valueTone?: MetricValueTone) => {
      setLines((prev) => [...prev, { id: prev.length + 1, text, tone, value, valueTone }]);
    },
    [],
  );

  const run = useCallback(async (scenario: DemoScenario) => {
    setLines([]);
    setResult(null);
    setStatus("running");

    pushLine("Gathering evidence", "header");

    let agentResult: AgentTestResult;
    try {
      agentResult = await runScenario(scenario);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
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
      "Investigation engine", "metric",
      modeLabel(agentResult.agent_mode), engineValueTone(agentResult.agent_mode),
    );
    pushServiceFailures(pushLine, t, attribution.investigation);

    const totalChecked = SIGNAL_STEPS.filter((s) => agentResult.signals_checked.includes(s.tool)).length;
    let stepNum = 0;

    for (const { tool, label } of SIGNAL_STEPS) {
      const wasChecked = agentResult.signals_checked.includes(tool);
      const wasSkipped = agentResult.signals_not_checked.includes(tool);

      if (wasChecked) {
        stepNum += 1;
        pushLine(`[${stepNum}/${totalChecked}] ${label}`, "step");
        const data = agentResult.raw_signals[tool];
        const degraded = Boolean(data?.degraded);
        pushLine(describeSignal(tool, data), degraded ? "error" : "success");
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
      "Decision engine", "metric",
      modeLabel(agentResult.recommendation_mode), engineValueTone(agentResult.recommendation_mode),
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