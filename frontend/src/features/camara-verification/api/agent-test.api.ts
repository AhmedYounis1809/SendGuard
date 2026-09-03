// Uses native fetch (NOT the shared ApiService) so this call is not bound
// by axios-client.ts's default timeout — a full Agent run (Gemini, maybe
// Groq fallback, multiple real network calls) can legitimately take much
// longer than a normal API call.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const AGENT_RUN_URL = `${API_BASE}/api/agent/run`;
const TIMEOUT_MS = 120_000; // 2 minutes — generous upper bound for Gemini + Groq fallback chain

export interface AgentTransactionInput {
  phone_number: string;
  amount: number;
  currency: string;
  is_new_beneficiary: boolean;
  recent_transaction_count_10min: number;
  usual_latitude: number;
  usual_longitude: number;
  location_reference_available: boolean;
  trusted_device_available: boolean;
}

export interface AgentTestResult {
  trust_index: number;
  tier: string;
  action: string;
  execution: Record<string, unknown>;
  reasons: string[];
  signals_checked: string[];
  signals_not_checked: string[];
  degraded_signals: string[];
  raw_signals: Record<string, Record<string, unknown>>;
  agent_mode: string;
  recommendation_mode: string;
  fallback_reason: string | null;
}

// Carries a translation key (+ interpolation params) instead of a hardcoded
// English message, so callers with access to the i18n `t()` function can
// render this in the active language.
export class AgentApiError extends Error {
  constructor(
    public readonly i18nKey: string,
    public readonly i18nParams: Record<string, string | number> | undefined,
    fallbackMessage: string,
  ) {
    super(fallbackMessage);
    this.name = "AgentApiError";
  }
}

export async function runAgentTest(payload: AgentTransactionInput): Promise<AgentTestResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(AGENT_RUN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AgentApiError(
        "verification.console.errors.http",
        { status: response.status, detail: text || response.statusText },
        `Agent request failed (${response.status}): ${text || response.statusText}`,
      );
    }

    return (await response.json()) as AgentTestResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AgentApiError(
        "verification.console.errors.timeout",
        { seconds: TIMEOUT_MS / 1000 },
        `Agent request timed out after ${TIMEOUT_MS / 1000}s`,
      );
    }
    if (error instanceof TypeError) {
      throw new AgentApiError(
        "verification.console.errors.network",
        { apiBase: API_BASE },
        `Could not reach the SendGuard backend at ${API_BASE}. Make sure the backend server is running and reachable, and that CORS allows this origin.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
