import { useCallback, useState } from "react";
import type { ScenarioId, TransactionResult } from "../types/trust-dashboard.types";
import { runTransactionScenario, submitVerification } from "../api/trust-dashboard.api";

export type DashboardStatus = "idle" | "running" | "revealing" | "done";

const SIGNAL_COUNT = 4;
const SIGNAL_REVEAL_DELAY_MS = 450;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useTrustDashboard() {
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [status, setStatus] = useState<DashboardStatus>("idle");
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [recovered, setRecovered] = useState(false);

  const run = useCallback(async (nextScenario: ScenarioId) => {
    setScenario(nextScenario);
    setStatus("running");
    setResult(null);
    setRevealedCount(0);
    setRecovered(false);

    const data = await runTransactionScenario(nextScenario);
    setResult(data);
    setStatus("revealing");

    for (let revealed = 1; revealed <= SIGNAL_COUNT; revealed += 1) {
      await wait(SIGNAL_REVEAL_DELAY_MS);
      setRevealedCount(revealed);
    }

    setStatus("done");
  }, []);

  const verify = useCallback(async () => {
    if (!result) return;
    setVerifying(true);
    const updated = await submitVerification(result.transaction_id);
    setResult((prev) =>
      prev
        ? { ...prev, trust_index: updated.trust_index, decision: updated.decision, reasons: updated.reasons }
        : prev,
    );
    setRecovered(true);
    setVerifying(false);
  }, [result]);

  return { scenario, status, result, revealedCount, verifying, recovered, run, verify };
}
