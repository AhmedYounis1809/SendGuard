import { useCallback, useRef, useState } from "react";
import { ApiError } from "../../../core/network/api-error";
import { useI18n } from "../../../core/i18n";
import { runAgentTest, type AgentTestResult } from "../api/agent-test.api";

export type ConsoleLineTone = "default" | "success" | "error" | "header";

export interface ConsoleLine {
  id: number;
  text: string;
  tone: ConsoleLineTone;
}

export type VerificationStatus = "idle" | "running" | "done" | "error";

const STEP_REVEAL_DELAY_MS = 450;
const DIVIDER = "=".repeat(60);

// The 3 signals the Agent MIGHT check — display order only. Whether each
// one actually appears depends entirely on what the Agent itself decided
// to call for this transaction (see signals_checked / signals_not_checked
// in the real response below).
const SIGNAL_STEPS: { tool: string; label: string }[] = [
  { tool: "check_sim_swap_tool", label: "SIM Swap" },
  { tool: "check_device_swap_tool", label: "Device Swap" },
  { tool: "check_location_tool", label: "Location Verification" },
];

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function describeSignal(tool: string, data: Record<string, unknown> | undefined): string {
  if (!data) return "no data";
  if (data.degraded) return `error: ${data.error ?? "unknown"}`;
  if (tool === "check_location_tool") {
    return `verificationResult=${data.verification_result}`;
  }
  return `hours_since_swap=${data.hours_since_swap}`;
}

export function useCamaraVerification(phoneNumber: string) {
  const { t } = useI18n();
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const nextLineId = useRef(0);

  const pushLine = useCallback((text: string, tone: ConsoleLineTone = "default") => {
    nextLineId.current += 1;
    setLines((prev) => [...prev, { id: nextLineId.current, text, tone }]);
  }, []);

  const run = useCallback(async () => {
    setLines([]);
    nextLineId.current = 0;
    setStatus("running");

    pushLine(DIVIDER, "header");
    pushLine(t("verification.console.header"), "header");
    pushLine(DIVIDER, "header");

    // --- ONE call. The Agent decides which signals to check and calls the
    // real CAMARA APIs itself. Everything shown below comes from this
    // single real run — nothing is pre-checked separately anymore. ---
    let agentResult: AgentTestResult;
    try {
      agentResult = await runAgentTest(phoneNumber);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unexpected error";
      pushLine("");
      pushLine(`Unexpected error: ${message}`, "error");
      setStatus("error");
      return;
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
        pushLine("");
        pushLine(`[${stepNum}/${totalChecked}] Agent is checking ${label}...`);
        await wait(STEP_REVEAL_DELAY_MS);

        const data = agentResult.raw_signals[tool] as Record<string, unknown> | undefined;
        const degraded = Boolean(data?.degraded);
        const detail = describeSignal(tool, data);
        pushLine(
          degraded ? `  ❌ FAILED: ${detail}` : `  ✅ PASSED — ${detail}`,
          degraded ? "error" : "success",
        );
      } else if (wasSkipped) {
        pushLine("");
        pushLine(`${label}: skipped by the agent (decided it wasn't needed for this transaction)`);
      }
    }

    pushLine("");
    pushLine(DIVIDER, "header");
    pushLine("Agent evidence gathering complete.", "success");
    pushLine(DIVIDER, "header");

    pushLine("");
    pushLine(`Trust Index: ${agentResult.trust_index}/100`);
    pushLine(`Risk Tier: ${agentResult.tier}`);
    pushLine(`Recommended Action: ${agentResult.action}`);

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
  }, [pushLine, t, phoneNumber]);

  return { lines, status, run };
}
