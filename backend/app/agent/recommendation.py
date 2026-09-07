"""SendGuard — Recommendation policy boundary (Gemini/Groq/Deterministic fallback lives in llm_client.py)."""

from app.agent.llm_client import choose_action as _choose_action_with_fallback

ALLOWED_ACTIONS_PER_TIER = {
    "ALLOW": ["ALLOW", "ALLOW_WITH_FRAUD_WARNING"],
    "ADAPTIVE_VERIFICATION": ["TRANSACTION_CONFIRMATION", "TRUSTED_DEVICE_CONFIRMATION"],
    "TRANSACTION_HOLD": ["TEMPORARY_SAFETY_HOLD", "OUT_OF_BAND_VERIFICATION"],
    "TEMPORARY_FREEZE": ["TEMPORARY_FREEZE_MANUAL_REVIEW"],
}


def recommend_action(tier: str, transaction_context: dict, degraded_signals: list, reasons: list = None) -> tuple[str, str, str]:
    """Returns (action, mode, fallback_reason). action is guaranteed to be a member of ALLOWED_ACTIONS_PER_TIER[tier]."""
    allowed = ALLOWED_ACTIONS_PER_TIER.get(tier, ["TEMPORARY_SAFETY_HOLD"])
    return _choose_action_with_fallback(tier, transaction_context, degraded_signals, reasons or [], allowed)