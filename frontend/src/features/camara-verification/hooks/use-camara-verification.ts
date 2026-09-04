import { useCallback, useState } from "react";
import { useI18n } from "../../../core/i18n";
import { AgentApiError, runAgentTest, type AgentTestResult, type AgentTransactionInput } from "../api/agent-test.api";

export type ConsoleLineTone =
  | "default"
  | "success"
  | "error"
  | "header"
  | "step"
  | "muted"
  | "metric"
  | "rule";

export interface ConsoleLine {
  id: number;
  text: string;
  tone: ConsoleLineTone;
  /** When set, the line renders as an aligned label/value row. */
  value?: string;
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

function modeLabel(mode: string): string {
  if (mode === "AI_GEMINI") return "Gemini (primary)";
  if (mode === "AI_GROQ_FALLBACK") return "Groq (fallback)";
  if (mode === "DETERMINISTIC_FALLBACK") return "Deterministic (no LLM available)";
  if (mode === "DETERMINISTIC_ONLY_OPTION") return "Deterministic (only option for this tier)";
  return mode;
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
    (text: string, tone: ConsoleLineTone = "default", value?: string) => {
      setLines((prev) => [...prev, { id: prev.length + 1, text, tone, value }]);
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

    pushLine("Signal source", "metric", modeLabel(agentResult.agent_mode));
    if (agentResult.fallback_reason) {
      pushLine(`fallback reason: ${agentResult.fallback_reason}`, "muted");
    }

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
    pushLine("Decision source", "metric", modeLabel(agentResult.recommendation_mode));

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
