"""SendGuard — Recommendation policy boundary."""

from typing import Optional

from app.agent.llm_client import (
    choose_action as _choose_action_with_fallback,
)

ALLOWED_ACTIONS_PER_TIER = {
    "ALLOW": [
        "ALLOW",
        "ALLOW_WITH_FRAUD_WARNING",
    ],

    "ADAPTIVE_VERIFICATION": [
        "TRANSACTION_CONFIRMATION",
        "TRUSTED_DEVICE_CONFIRMATION",
    ],

    "TRANSACTION_HOLD": [
        "TEMPORARY_SAFETY_HOLD",
        "OUT_OF_BAND_VERIFICATION",
    ],

    "TEMPORARY_FREEZE": [
        "TEMPORARY_FREEZE_MANUAL_REVIEW",
    ],
}


def get_allowed_actions(
    tier: str,
    transaction_context: dict,
) -> list[str]:

    allowed = list(
        ALLOWED_ACTIONS_PER_TIER.get(
            tier,
            ["TEMPORARY_SAFETY_HOLD"],
        )
    )

    if not transaction_context.get(
        "trusted_device_available",
        False,
    ):
        if "TRUSTED_DEVICE_CONFIRMATION" in allowed:
            allowed.remove("TRUSTED_DEVICE_CONFIRMATION")

    if not allowed:
        return ["TEMPORARY_SAFETY_HOLD"]

    return allowed


def recommend_action(
    tier: str,
    transaction_context: dict,
    degraded_signals: list,
    reasons: Optional[list] = None,
) -> tuple[str, str, Optional[str]]:

    allowed = get_allowed_actions(
        tier,
        transaction_context,
    )

    return _choose_action_with_fallback(
        tier,
        transaction_context,
        degraded_signals,
        reasons or [],
        allowed,
    )