import { useCallback, useRef, useState } from "react";
import { ApiError } from "../../../core/network/api-error";
import { useI18n } from "../../../core/i18n";
import { runCamaraVerification } from "../api/camara-verification.api";

export type ConsoleLineTone = "default" | "success" | "error" | "header";

export interface ConsoleLine {
  id: number;
  text: string;
  tone: ConsoleLineTone;
}

export type VerificationStatus = "idle" | "running" | "done" | "error";

const STEP_REVEAL_DELAY_MS = 450;
const DIVIDER = "=".repeat(60);

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
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

    try {
      const result = await runCamaraVerification(phoneNumber);

      for (const step of result.steps) {
        const signalName = t(`verification.signals.${step.id}`);
        pushLine("");
        pushLine(
          t("verification.console.testing", {
            step: step.step,
            total: result.steps.length,
            name: signalName,
          }),
        );
        await wait(STEP_REVEAL_DELAY_MS);

        const statusWord = step.passed
          ? t("verification.console.passed")
          : t("verification.console.failed");
        const line = step.passed
          ? `  ✅ ${statusWord} — ${step.detail}`
          : `  ❌ ${statusWord}: ${step.detail}`;
        pushLine(line, step.passed ? "success" : "error");
      }

      pushLine("");
      pushLine(DIVIDER, "header");
      pushLine(
        result.all_passed
          ? t("verification.console.allPassed")
          : t("verification.console.someFailed"),
        result.all_passed ? "success" : "error",
      );
      pushLine(DIVIDER, "header");

      setStatus(result.all_passed ? "done" : "error");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unexpected error";
      pushLine("");
      pushLine(t("verification.console.unexpectedError", { message }), "error");
      setStatus("error");
    }
  }, [pushLine, t, phoneNumber]);

  return { lines, status, run };
}
