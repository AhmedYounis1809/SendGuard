/**
 * Mirrors the backend's 3-tier reliability fallback
 * (backend/app/agent/llm_client.py): Gemini -> Groq -> Deterministic.
 *
 * The chain runs TWICE and independently per transaction — once to decide
 * which network signals to gather (`investigate_transaction`, surfaced as
 * `agent_mode`) and once to pick the final action (`choose_action`,
 * surfaced as `recommendation_mode`). Either stage can degrade on its own,
 * so both are rendered separately rather than as one overall "engine".
 */

export type AgentMode =
  | "AI_GEMINI"
  | "AI_GROQ_FALLBACK"
  | "DETERMINISTIC_FALLBACK"
  | "DETERMINISTIC_ONLY_OPTION";

export type TierId = "gemini" | "groq" | "deterministic";

export type TierState =
  /** This tier produced the result. */
  | "active"
  /** Tried and threw (or returned an invalid action) — the chain moved on. */
  | "failed"
  /** Never reached, because an earlier tier already succeeded. */
  | "unused"
  /** Skipped by policy, not by failure — see DETERMINISTIC_ONLY_OPTION. */
  | "bypassed";

export const TIERS: { id: TierId; label: string }[] = [
  { id: "gemini", label: "Gemini" },
  { id: "groq", label: "Groq" },
  { id: "deterministic", label: "Deterministic" },
];

const STATES: Record<AgentMode, Record<TierId, TierState>> = {
  AI_GEMINI: { gemini: "active", groq: "unused", deterministic: "unused" },
  AI_GROQ_FALLBACK: { gemini: "failed", groq: "active", deterministic: "unused" },
  DETERMINISTIC_FALLBACK: { gemini: "failed", groq: "failed", deterministic: "active" },
  // Not a failure: the trust tier left exactly one legal action (e.g.
  // TEMPORARY_FREEZE), so there was nothing for an LLM to decide and the
  // policy layer short-circuits before any model is called.
  DETERMINISTIC_ONLY_OPTION: {
    gemini: "bypassed",
    groq: "bypassed",
    deterministic: "active",
  },
};

const UNKNOWN_STATES: Record<TierId, TierState> = {
  gemini: "unused",
  groq: "unused",
  deterministic: "unused",
};

export function tierStates(mode: string): Record<TierId, TierState> {
  return STATES[mode as AgentMode] ?? UNKNOWN_STATES;
}

const LABELS: Record<AgentMode, string> = {
  AI_GEMINI: "Gemini (primary)",
  AI_GROQ_FALLBACK: "Groq (fallback)",
  DETERMINISTIC_FALLBACK: "Deterministic (no LLM available)",
  DETERMINISTIC_ONLY_OPTION: "Deterministic (only legal action)",
};

export function modeLabel(mode: string): string {
  return LABELS[mode as AgentMode] ?? mode;
}

/**
 * True only when the chain fell back because something *failed*.
 * DETERMINISTIC_ONLY_OPTION is a normal policy outcome, not degradation.
 */
export function isDegraded(mode: string): boolean {
  return mode === "AI_GROQ_FALLBACK" || mode === "DETERMINISTIC_FALLBACK";
}
