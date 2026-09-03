import { useEffect, useRef } from "react";
import { useI18n } from "../../../core/i18n";
import { useCamaraVerification } from "../hooks/use-camara-verification";
import type { AgentTransactionInput } from "../api/agent-test.api";
import "./verification-console.css";

interface VerificationConsoleProps {
  payload: AgentTransactionInput;
}

const SIGNAL_STEPS: { tool: string; label: string }[] = [
  {
    tool: "check_sim_swap_tool",
    label: "SIM Swap",
  },
  {
    tool: "check_device_swap_tool",
    label: "Device Swap",
  },
  {
    tool: "check_location_tool",
    label: "Location Verification",
  },
];

function describeSignal(
  tool: string,
  data: Record<string, unknown> | undefined,
): string {
  if (!data) return "no data";

  if (data.degraded) {
    return `error: ${data.error ?? "unknown"}`;
  }

  if (tool === "check_location_tool") {
    return `verificationResult=${
      data.verification_result ?? "unknown"
    }`;
  }

  return `hours_since_swap=${
    data.hours_since_swap ?? "unknown"
  }`;
}

function modeLabel(mode: string): string {
  if (mode === "AI_GEMINI") {
    return "🟢 Gemini (primary)";
  }

  if (mode === "AI_GROQ_FALLBACK") {
    return "🟡 Groq (fallback)";
  }

  if (mode === "DETERMINISTIC_FALLBACK") {
    return "🔴 Deterministic (no LLM available)";
  }

  if (mode === "DETERMINISTIC_ONLY_OPTION") {
    return "⚪ Deterministic (only option for this tier)";
  }

  return mode;
}

export function VerificationConsole({
  payload,
}: VerificationConsoleProps) {
  const { t } = useI18n();

  const { lines, status, run } =
    useCamaraVerification();

  const outputRef = useRef<HTMLPreElement>(null);

  const isRunning = status === "running";

  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
    });
  }, [lines]);

  const handleRun = () => {
    run(payload);
  };

  return (
    <section className="verification-console">
      <header className="verification-console__header">
        <div>
          <h2>{t("verification.title")}</h2>

          <p>{t("verification.description")}</p>

          <p className="verification-console__phone-note">
            {t("verification.phoneNumberNote", {
              phoneNumber: payload.phone_number,
            })}
          </p>
        </div>

        <button
          type="button"
          className="verification-console__run-btn"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning
            ? t("verification.runningButton")
            : t("verification.runButton")}
        </button>
      </header>

      {/* Payload summary */}
      <div className="verification-console__summary">
        <div>
          <strong>Amount:</strong>{" "}
          {payload.amount} {payload.currency}
        </div>

        <div>
          <strong>New Beneficiary:</strong>{" "}
          {String(payload.is_new_beneficiary)}
        </div>

        <div>
          <strong>Recent Transactions:</strong>{" "}
          {payload.recent_transaction_count_10min}
        </div>

        <div>
          <strong>Location Reference:</strong>{" "}
          {String(
            payload.location_reference_available,
          )}
        </div>

        <div>
          <strong>Trusted Device:</strong>{" "}
          {String(
            payload.trusted_device_available,
          )}
        </div>
      </div>

      {status !== "idle" && status !== "running" && (
        <span
          className={`verification-console__status verification-console__status--${status}`}
        >
          {status === "done"
            ? t("verification.statusDone")
            : t("verification.statusError")}
        </span>
      )}

      <pre
        className="verification-console__output"
        ref={outputRef}
        dir="ltr"
        aria-live="polite"
      >
        {lines.length === 0 && (
          <span className="verification-console__placeholder">
            {t("verification.placeholder")}
          </span>
        )}

        {lines.map((line) => (
          <div
            key={line.id}
            className={`verification-console__line verification-console__line--${line.tone}`}
          >
            {line.text || " "}
          </div>
        ))}
      </pre>
    </section>
  );
}
