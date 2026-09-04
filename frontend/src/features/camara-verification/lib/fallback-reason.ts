import { isDegraded } from "./agent-modes";

/**
 * The backend only reports the *raw* exception text for a failed tier
 * (`Gemini failed: 503 UNAVAILABLE. {...}` etc — see
 * backend/app/agent/llm_client.py). That's fine for logs but meaningless to
 * an end user, so this classifies each "<Service> failed: <message>" segment
 * into a small set of causes the UI can render as a friendly, localized
 * sentence instead of the raw provider payload.
 */

export type FallbackCause =
  | "rate_limited"
  | "unavailable"
  | "auth"
  | "timeout"
  | "not_configured"
  | "unknown";

export interface ServiceFailure {
  service: string;
  cause: FallbackCause;
}

function classifyMessage(message: string): FallbackCause {
  const lower = message.toLowerCase();

  if (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("quota")
  ) {
    return "rate_limited";
  }

  if (
    lower.includes("not configured") ||
    lower.includes("not installed")
  ) {
    return "not_configured";
  }

  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("permission_denied") ||
    lower.includes("unauthenticated") ||
    lower.includes("api key") ||
    lower.includes("api_key")
  ) {
    return "auth";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "timeout";
  }

  if (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  ) {
    return "unavailable";
  }

  return "unknown";
}

/**
 * Splits the backend's `"Gemini failed: X | Groq failed: Y"` string into
 * one entry per service. Falls back to a single "Engine" entry if the text
 * doesn't match the expected `<Service> failed: <message>` shape.
 */
export function parseFallbackFailures(reason: string): ServiceFailure[] {
  return reason
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\w+)\s+failed:\s*(.*)$/i);
      const service = match?.[1] ?? "Engine";
      const message = match?.[2] ?? part;
      return { service, cause: classifyMessage(message) };
    });
}

export interface AttributedFallback {
  investigation: ServiceFailure[];
  recommendation: ServiceFailure[];
  /**
   * True when the recommendation stage also fell back but the backend's
   * single `fallback_reason` field was already claimed by investigation
   * (see agent.py: `investigation_fallback_reason or
   * recommendation_fallback_reason`) — the recommendation's own reason
   * exists on the server but never reaches the client, so it can't be
   * displayed. This flag lets the UI say so honestly instead of either
   * fabricating a reason or silently showing nothing.
   */
  recommendationReasonLost: boolean;
}

/**
 * Attributes the backend's one combined `fallback_reason` string to
 * whichever stage(s) actually degraded, so the console and the Engine
 * Resilience panel can both show the failure next to the stage it explains
 * instead of one disconnected blurb at the end.
 */
export function attributeFallbackReason(
  investigationMode: string,
  recommendationMode: string,
  reason: string | null | undefined,
): AttributedFallback {
  const investigationDegraded = isDegraded(investigationMode);
  const recommendationDegraded = isDegraded(recommendationMode);
  const failures = reason ? parseFallbackFailures(reason) : [];

  if (investigationDegraded) {
    return {
      investigation: failures,
      recommendation: [],
      recommendationReasonLost: recommendationDegraded,
    };
  }

  if (recommendationDegraded) {
    return { investigation: [], recommendation: failures, recommendationReasonLost: false };
  }

  return { investigation: [], recommendation: [], recommendationReasonLost: false };
}
