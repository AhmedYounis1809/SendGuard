import { useCallback, useState } from "react";
import { useI18n } from "../../../core/i18n";
import { AgentApiError, runAgentTest, type AgentTestResult, type AgentTransactionInput } from "../api/agent-test.api";

export type ConsoleLineTone = "default" | "success" | "error" | "header";

export interface ConsoleLine {
  id: number;
  text: string;
  tone: ConsoleLineTone;
}

export type VerificationStatus = "idle" | "running" | "done" | "error";

const DIVIDER = "=".repeat(60);

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
  if (mode === "AI_GEMINI") return "🟢 Gemini (primary)";
  if (mode === "AI_GROQ_FALLBACK") return "🟡 Groq (fallback)";
  if (mode === "DETERMINISTIC_FALLBACK") return "🔴 Deterministic (no LLM available)";
  if (mode === "DETERMINISTIC_ONLY_OPTION") return "⚪ Deterministic (only option for this tier)";
  return mode;
}

export function useCamaraVerification() {
  const { t } = useI18n();
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [status, setStatus] = useState<VerificationStatus>("idle");

  // Derives the next id purely from `prev` — no external mutable counter —
  // so this stays safe under Strict Mode's double-invocation of state
  // updaters (a ref-based counter read here previously caused colliding
  // ids and "duplicate key" warnings under the double invoke).
  const pushLine = useCallback((text: string, tone: ConsoleLineTone = "default") => {
    setLines((prev) => [...prev, { id: prev.length + 1, text, tone }]);
  }, []);

  const run = useCallback(async (payload: AgentTransactionInput) => {
    setLines([]);
    setStatus("running");

    pushLine(DIVIDER, "header");
    pushLine("SendGuard — Running AI Agent", "header");
    pushLine(DIVIDER, "header");

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
      pushLine("");
      pushLine(`❌ ${message}`, "error");
      setStatus("error");
      return;
    }

    pushLine("");
    pushLine(`Signal source: ${modeLabel(agentResult.agent_mode)}`);
    if (agentResult.fallback_reason) {
      pushLine(`  (fallback reason: ${agentResult.fallback_reason})`);
    }

    const totalChecked = SIGNAL_STEPS.filter((s) => agentResult.signals_checked.includes(s.tool)).length;
    let stepNum = 0;

    for (const { tool, label } of SIGNAL_STEPS) {
      const wasChecked = agentResult.signals_checked.includes(tool);
      const wasSkipped = agentResult.signals_not_checked.includes(tool);

      if (wasChecked) {
        stepNum += 1;
        pushLine("");
        pushLine(`[${stepNum}/${totalChecked}] Checking ${label}...`);
        const data = agentResult.raw_signals[tool];
        const degraded = Boolean(data?.degraded);
        const detail = describeSignal(tool, data);
        pushLine(degraded ? `  ❌ FAILED: ${detail}` : `  ✅ PASSED — ${detail}`, degraded ? "error" : "success");
      } else if (wasSkipped) {
        pushLine("");
        pushLine(`${label}: skipped by the agent (not needed for this transaction)`);
      }
    }

    pushLine("");
    pushLine(DIVIDER, "header");
    pushLine("Evidence gathering complete.", "success");
    pushLine(DIVIDER, "header");

    pushLine("");
    pushLine(`Trust Index: ${agentResult.trust_index}/100`);
    pushLine(`Risk Tier: ${agentResult.tier}`);
    pushLine(`Recommended Action: ${agentResult.action}`);
    pushLine(`Decision source: ${modeLabel(agentResult.recommendation_mode)}`);

    pushLine("");
    pushLine("Reasoning:");
    for (const reason of agentResult.reasons) {
      pushLine(`  • ${reason}`);
    }

    pushLine("");
    pushLine(DIVIDER, "header");
    pushLine("✅ Agent decision complete.", "success");
    pushLine(DIVIDER, "header");

    setStatus("done");
  }, [pushLine, t]);

  return { lines, status, run };
}
