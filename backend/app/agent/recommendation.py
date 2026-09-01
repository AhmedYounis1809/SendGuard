"""
SendGuard — Recommendation Layer (Deterministic, rule-based — no LLM here)

Given the tier that trust_engine.py computed, this picks the SPECIFIC
action within that tier's allowed set (see BACKLOG.md — the "closed action
enum" decision).

Deliberately NOT an LLM call: the choice here reduces to context flags we
already have (is a previously-trusted device on file for this user? did any
signal degrade?), which are simple boolean lookups — not the kind of
ambiguous judgment that benefits from LLM reasoning. Keeping this
deterministic removes another point of non-determinism from a pipeline that
ultimately controls real money movement.
"""

ALLOWED_ACTIONS_PER_TIER = {
    "ALLOW": ["ALLOW", "ALLOW_WITH_FRAUD_WARNING"],
    "ADAPTIVE_VERIFICATION": ["TRANSACTION_CONFIRMATION", "TRUSTED_DEVICE_CONFIRMATION"],
    "TRANSACTION_HOLD": ["TEMPORARY_SAFETY_HOLD", "OUT_OF_BAND_VERIFICATION"],
    "TEMPORARY_FREEZE": ["TEMPORARY_FREEZE_MANUAL_REVIEW"],
}


def recommend_action(tier: str, transaction_context: dict, degraded_signals: list) -> str:
    """
    Args:
        tier: one of ALLOW / ADAPTIVE_VERIFICATION / TRANSACTION_HOLD / TEMPORARY_FREEZE
              (from trust_engine.TrustAssessment.tier)
        transaction_context: same dict used throughout — checked here for
              `trusted_device_available` (bool)
        degraded_signals: from TrustAssessment.degraded_signals — if any
              signal failed, we lean toward the more cautious option even
              within an ALLOW tier

    Returns:
        One string, guaranteed to be a member of
        ALLOWED_ACTIONS_PER_TIER[tier] — never a free-form/hallucinated value.
    """
    trusted_device_available = transaction_context.get("trusted_device_available", False)

    if tier == "ALLOW":
        return "ALLOW_WITH_FRAUD_WARNING" if degraded_signals else "ALLOW"

    if tier == "ADAPTIVE_VERIFICATION":
        return "TRUSTED_DEVICE_CONFIRMATION" if trusted_device_available else "TRANSACTION_CONFIRMATION"

    if tier == "TRANSACTION_HOLD":
        return "OUT_OF_BAND_VERIFICATION" if trusted_device_available else "TEMPORARY_SAFETY_HOLD"

    if tier == "TEMPORARY_FREEZE":
        return "TEMPORARY_FREEZE_MANUAL_REVIEW"

    # Should be unreachable given trust_engine.tier_for_score()'s fixed
    # output set, but a safe fallback is cheap insurance.
    return "TEMPORARY_SAFETY_HOLD"
    