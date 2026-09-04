import { useEffect, useRef, useState } from "react";
import type {
  ConsoleLine,
  VerificationStatus,
} from "../hooks/use-camara-verification";
import "./verification-flow.css";

interface AgentConsoleProps {
  lines: ConsoleLine[];
  status: VerificationStatus;
  /** Text shown in the window title bar. */
  title?: string;
  /** Shown in the body while the console has never been run. */
  placeholder?: string;
  /** Human-readable status shown at the end of the title bar. */
  statusLabel?: string;
  tall?: boolean;
}

const STATUS_MODIFIER: Record<VerificationStatus, string> = {
  idle: "",
  running: "ra-terminal__status--running",
  done: "ra-terminal__status--done",
  error: "ra-terminal__status--error",
};

const DEFAULT_STATUS_LABEL: Record<VerificationStatus, string> = {
  idle: "Idle",
  running: "Running",
  done: "Complete",
  error: "Failed",
};

export function AgentConsole({
  lines,
  status,
  title = "sendguard-agent-cli",
  placeholder,
  statusLabel,
  tall = false,
}: AgentConsoleProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);

  const isRunning = status === "running";

  // Elapsed counter — an agent run chains several live network calls and
  // can legitimately take up to a minute, so a still spinner alone reads
  // as "hung". The seconds tick gives the wait a visible floor.
  useEffect(() => {
    if (!isRunning) return;
    setElapsed(0);
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines, status]);

  return (
    <div className={`ra-terminal ${isRunning ? "ra-terminal--running" : ""}`}>
      <div className="ra-terminal__titlebar">
        <span className="ra-terminal__dots">
          <span className="ra-terminal__dot ra-terminal__dot--red" />
          <span className="ra-terminal__dot ra-terminal__dot--yellow" />
          <span className="ra-terminal__dot ra-terminal__dot--green" />
        </span>
        <span className="ra-terminal__title">{title}</span>
        <span className={`ra-terminal__status ${STATUS_MODIFIER[status]}`}>
          {statusLabel ?? DEFAULT_STATUS_LABEL[status]}
        </span>
      </div>

      {/* Indeterminate progress rail — only rendered while running. */}
      {isRunning && <div className="ra-terminal__rail" aria-hidden="true" />}

      <div
        className={`ra-terminal__body ${tall ? "ra-terminal__body--tall" : ""}`}
        ref={bodyRef}
        dir="ltr"
        aria-live="polite"
        aria-busy={isRunning}
      >
        {lines.length === 0 && !isRunning && placeholder && (
          <div className="ra-line ra-line--placeholder">{placeholder}</div>
        )}

        {lines.map((line) => {
          if (line.tone === "rule") {
            return <div key={line.id} className="ra-line__rule" role="separator" />;
          }

          if (line.tone === "metric") {
            return (
              <div key={line.id} className="ra-line ra-line--metric">
                <span className="ra-line__label">{line.text}</span>
                <span className="ra-line__dots" aria-hidden="true" />
                <span
                  className={`ra-line__value ${
                    line.valueTone ? `ra-line__value--${line.valueTone}` : ""
                  }`}
                >
                  {line.value}
                </span>
              </div>
            );
          }

          return (
            <div key={line.id} className={`ra-line ra-line--${line.tone}`}>
              <span className="ra-line__marker" aria-hidden="true" />
              <span className="ra-line__text">{line.text}</span>
            </div>
          );
        })}

        {isRunning && (
          <div className="ra-loader" role="status">
            <span className="ra-loader__spinner" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="ra-loader__text">Querying network signals</span>
            <span className="ra-loader__elapsed">{elapsed}s</span>
          </div>
        )}

        {status === "done" && <div className="ra-cursor" aria-hidden="true" />}
      </div>
    </div>
  );
}
