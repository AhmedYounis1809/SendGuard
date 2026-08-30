import { useEffect, useRef } from "react";
import { useI18n } from "../../../core/i18n";
import { useCamaraVerification } from "../hooks/use-camara-verification";
import "./verification-console.css";

export function VerificationConsole() {
  const { t } = useI18n();
  const { lines, status, run } = useCamaraVerification();
  const outputRef = useRef<HTMLPreElement>(null);
  const isRunning = status === "running";

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [lines]);

  return (
    <section className="verification-console">
      <header className="verification-console__header">
        <div>
          <h2>{t("verification.title")}</h2>
          <p>{t("verification.description")}</p>
        </div>
        <button
          type="button"
          className="verification-console__run-btn"
          onClick={run}
          disabled={isRunning}
        >
          {isRunning ? t("verification.runningButton") : t("verification.runButton")}
        </button>
      </header>

      {status !== "idle" && status !== "running" && (
        <span className={`verification-console__status verification-console__status--${status}`}>
          {status === "done" ? t("verification.statusDone") : t("verification.statusError")}
        </span>
      )}

      <pre
        className="verification-console__output"
        ref={outputRef}
        dir="ltr"
        aria-live="polite"
      >
        {lines.length === 0 && (
          <span className="verification-console__placeholder">{t("verification.placeholder")}</span>
        )}
        {lines.map((line) => (
          <div
            key={line.id}
            className={`verification-console__line verification-console__line--${line.tone}`}
          >
            {line.text || " "}
          </div>
        ))}
      </pre>
    </section>
  );
}
