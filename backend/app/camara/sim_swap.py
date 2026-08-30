"""
SendGuard — SIM Swap signal.

✅ FULLY CONFIRMED — tested live against the team's real Nokia App Key
(Simulator Mode) via PowerShell before this code was written.

Confirmed operations:

    POST sim-swap/sim-swap/v0/check
        body: {"phoneNumber": "...", "maxAge": <hours>}
        response: {"swapped": true/false}

    POST sim-swap/sim-swap/v0/retrieve-date
        body: {"phoneNumber": "..."}
        response: {"latestSimChange": "<ISO 8601 timestamp>"}

Verified test case: phoneNumber "+99999991000" (Nokia's own simulator
number) -> swapped: true, latestSimChange: "2026-08-30T01:21:43.112028Z"

We use `retrieve-date` (ONE call) instead of calling `check` three times
with different max_age windows — more efficient and more precise, since we
get the exact timestamp and compute our own Time Decay tiers in Python.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from .client import post


@dataclass
class SimSwapSignal:
    swapped_recently: bool          # True if swap happened within our "relevant" window (30 days)
    hours_since_swap: Optional[float]
    weight: int                     # Trust Engine contribution (negative = risk)
    degraded: bool                  # True if the API call failed — see trust_engine.py
    raw_response: dict


def check_sim_swap(phone_number: str, max_age_hours: int = 24) -> bool:
    """Simple boolean check: did a SIM swap happen within max_age_hours?"""
    try:
        result = post(
            "sim-swap/sim-swap/v0/check",
            {"phoneNumber": phone_number, "maxAge": max_age_hours},
        )
        return bool(result.get("swapped", False))
    except Exception as exc:
        print(f"[SendGuard] SIM Swap check failed: {exc}")
        return False


def get_sim_swap_score(phone_number: str) -> SimSwapSignal:
    """
    Retrieves the exact last-swap timestamp and applies our Time Decay
    weighting for the Trust Engine, in a single API call.

    Weight tiers (matches docs/architecture.md and the Trust Index design):
        < 24h     -> -25  (strong risk signal)
        < 1 week  -> -10  (moderate)
        < 1 month -> -2   (weak)
        older / never -> 0
    """
    try:
        result = post("sim-swap/sim-swap/v0/retrieve-date", {"phoneNumber": phone_number})
        latest_change_str = result.get("latestSimChange")

        if not latest_change_str:
            return SimSwapSignal(False, None, 0, False, result)

        latest_change = datetime.fromisoformat(latest_change_str.replace("Z", "+00:00"))
        hours_since = (datetime.now(timezone.utc) - latest_change).total_seconds() / 3600

        if hours_since < 24:
            weight = -25
        elif hours_since < 24 * 7:
            weight = -10
        elif hours_since < 24 * 30:
            weight = -2
        else:
            weight = 0

        return SimSwapSignal(
            swapped_recently=hours_since < 24 * 30,
            hours_since_swap=round(hours_since, 2),
            weight=weight,
            degraded=False,
            raw_response=result,
        )
    except Exception as exc:
        # Degraded Mode: an API failure must NOT be silently treated as
        # "safe" (weight 0 with degraded=False). trust_engine.py should
        # check `degraded` and lean toward Adaptive Verification instead of
        # a confident Allow when any signal is degraded.
        print(f"[SendGuard] SIM Swap retrieve-date failed: {exc}")
        return SimSwapSignal(
            swapped_recently=False,
            hours_since_swap=None,
            weight=0,
            degraded=True,
            raw_response={"error": str(exc)},
        )
        