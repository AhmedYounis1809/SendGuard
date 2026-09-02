"""
SendGuard — Recommendation Layer (Hybrid: Gemini chooses, Python enforces)

REVISED per design review: the original version was 100% deterministic
(a simple if/else on `trusted_device_available`). That under-sells the
competition's requirement that the AI Agent make a real decision, not just
select which APIs to call. This version keeps Python fully in control of
the SAFETY BOUNDARY (which actions are even possible for a given risk
tier — this NEVER changes and is NEVER decided by the model), while
letting Gemini make the actual judgment call of WHICH of those allowed
actions best fits this specific transaction's evidence.

Responsibility split (unchanged philosophy, refined implementation):
  - Python (ALLOWED_ACTIONS_PER_TIER): defines the hard safety boundary —
    what's even possible for this risk tier. The model can never escape
    this set, no matter what it outputs.
  - Gemini: reasons over the evidence (reasons list, trusted_device
    availability, degraded signals) and picks the best-fitting action
    from within that boundary — genuine agentic decision-making.
  - Python (validation): checks the model's choice is actually a member of
    the allowed set before it's ever used. If not — API failure, malformed
    output, anything — falls back to a safe deterministic default. The
    model proposes; the code enforces. Always.
"""

import os
from typing import Optional
from google import genai
from google.genai import types

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

ALLOWED_ACTIONS_PER_TIER = {
    "ALLOW": ["ALLOW", "ALLOW_WITH_FRAUD_WARNING"],
    "ADAPTIVE_VERIFICATION": ["TRANSACTION_CONFIRMATION", "TRUSTED_DEVICE_CONFIRMATION"],
    "TRANSACTION_HOLD": ["TEMPORARY_SAFETY_HOLD", "OUT_OF_BAND_VERIFICATION"],
    "TEMPORARY_FREEZE": ["TEMPORARY_FREEZE_MANUAL_REVIEW"],
}

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client()
    return _client


def _deterministic_fallback(tier: str, transaction_context: dict) -> str:
    """
    Safety-net logic used if the Gemini call fails, times out, or returns
    something outside the allowed set. This is exactly the original
    deterministic rule — kept as a reliable fallback, not removed.
    """
    trusted_device_available = transaction_context.get("trusted_device_available", False)

    if tier == "ALLOW":
        return "ALLOW"
    if tier == "ADAPTIVE_VERIFICATION":
        return "TRUSTED_DEVICE_CONFIRMATION" if trusted_device_available else "TRANSACTION_CONFIRMATION"
    if tier == "TRANSACTION_HOLD":
        return "OUT_OF_BAND_VERIFICATION" if trusted_device_available else "TEMPORARY_SAFETY_HOLD"
    if tier == "TEMPORARY_FREEZE":
        return "TEMPORARY_FREEZE_MANUAL_REVIEW"
    return "TEMPORARY_SAFETY_HOLD"


def recommend_action(
    tier: str,
    transaction_context: dict,
    degraded_signals: list,
    reasons: Optional[list] = None,
) -> str:
    """
    Args:
        tier: ALLOW / ADAPTIVE_VERIFICATION / TRANSACTION_HOLD / TEMPORARY_FREEZE
        transaction_context: checked for `trusted_device_available`
        degraded_signals: from TrustAssessment — if signals failed, this is
            passed to Gemini as context (a failed check is itself evidence
            worth reasoning about)
        reasons: the human-readable evidence list from trust_engine.py —
            this is what Gemini reasons over to make its choice

    Returns:
        One string, GUARANTEED to be a member of
        ALLOWED_ACTIONS_PER_TIER[tier] — never a free-form/hallucinated
        value, regardless of what the model does.
    """
    allowed = ALLOWED_ACTIONS_PER_TIER.get(tier, ["TEMPORARY_SAFETY_HOLD"])
    reasons = reasons or []

    # No real choice to make — skip the LLM call entirely, nothing to decide.
    if len(allowed) == 1:
        return allowed[0]

    try:
        client = _get_client()

        choose_action_fn = types.FunctionDeclaration(
            name="choose_action",
            description=(
                "Selects the most appropriate security action for this "
                "transaction, from the allowed options for its risk tier."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "action": types.Schema(
                        type="STRING",
                        enum=allowed,
                        description="Must be exactly one of the allowed options.",
                    ),
                    "justification": types.Schema(
                        type="STRING",
                        description="One short sentence explaining the choice.",
                    ),
                },
                required=["action"],
            ),
        )

        prompt = f"""A transaction has been assessed at risk tier: {tier}

Evidence gathered about this transaction:
{chr(10).join(f"- {r}" for r in reasons) if reasons else "- (no specific evidence recorded)"}

Degraded/unavailable signals: {degraded_signals or "none"}
Trusted previous device available for this user: {transaction_context.get("trusted_device_available", False)}

The allowed actions for this risk tier are: {allowed}

Call choose_action with the option that best fits this specific evidence.
For example: if a trusted device is available, verification through that
channel is generally stronger than a same-device confirmation; if signals
are degraded/unavailable, prefer the more cautious option."""

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(function_declarations=[choose_action_fn])],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            ),
        )

        calls = response.function_calls or []
        chosen = None
        for call in calls:
            if call.name == "choose_action":
                chosen = call.args.get("action")
                break

        # --- Python validates. The model can never escape the boundary. ---
        if chosen in allowed:
            return chosen

        print(
            f"[SendGuard] Gemini's action choice ('{chosen}') was not in the "
            f"allowed set {allowed} for tier {tier} — using deterministic fallback."
        )

    except Exception as exc:
        print(f"[SendGuard] Recommendation call failed ({exc}) — using deterministic fallback.")

    return _deterministic_fallback(tier, transaction_context)
    