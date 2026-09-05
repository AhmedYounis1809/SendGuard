import type { AgentTestResult, AgentTransactionInput } from "../../../core/network/agent-types";
import type { DemoScenario } from "../types/trust-dashboard.types";

// Same real simulator number used everywhere else in the project — the
// mock signals returned for a scenario come from the backend's demo-mode
// injection, not from calling Nokia, so this number is never actually
// dialed out to for scenario runs.
const SIMULATOR_PHONE_NUMBER = "+99999991000";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const TIMEOUT_MS = 120_000;

export async function runScenario(scenario: DemoScenario): Promise<AgentTestResult> {
  const payload: AgentTransactionInput = {
    phone_number: SIMULATOR_PHONE_NUMBER,
    ...scenario.payload,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/scenarios/${scenario.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Scenario request failed (${response.status}): ${text || response.statusText}`);
    }

    return (await response.json()) as AgentTestResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Scenario request timed out after ${TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}