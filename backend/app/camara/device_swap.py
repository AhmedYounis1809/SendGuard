"""
SendGuard — Device Swap signal.

✅ FULLY CONFIRMED — tested live by the team with simulator numbers.

Confirmed operations (note: v1, NOT v0, unlike SIM Swap):

    POST device-swap/device-swap/v1/check
        body: {"phoneNumber": "...", "maxAge": <hours>}
        response: {"swapped": true/false}

    POST device-swap/device-swap/v1/retrieve-date
        body: {"phoneNumber": "..."}
        response: {"latestDeviceChange": "<ISO 8601 timestamp>"}
        (field name is "latestDeviceChange", NOT "latestSimChange")

Verified test cases:
    +99999991000 -> check(maxAge=120) -> swapped: true
    +99999991001 -> retrieve-date -> latestDeviceChange: "2026-08-18T13:27:11.128970Z"

Mirrors the SIM Swap signal design: one `retrieve-date` call gives us the
exact timestamp, and we compute Time Decay weight tiers ourselves in Python.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from .client import post


@dataclass
class DeviceSwapSignal:
    swapped_recently: bool
    hours_since_swap: Optional[float]
    weight: int          # Trust Engine contribution (negative = risk)
    degraded: bool
    raw_response: dict


def check_device_swap(phone_number: str, max_age_hours: int = 24) -> bool:
    """Simple boolean check: did the device change within max_age_hours?"""
    try:
        result = post(
            "device-swap/device-swap/v1/check",
            {"phoneNumber": phone_number, "maxAge": max_age_hours},
        )
        return bool(result.get("swapped", False))
    except Exception as exc:
        print(f"[SendGuard] Device Swap check failed: {exc}")
        return False


def get_device_swap_score(phone_number: str) -> DeviceSwapSignal:
    """
    Retrieves the exact last-device-change timestamp and applies Time Decay
    weighting for the Trust Engine.

    Weight tiers (device swap is treated as slightly less severe than SIM
    swap in our design — a new phone is more commonly innocent than a fresh
    SIM change tied directly to a transaction):
        < 24h     -> -15
        < 1 week  -> -8
        < 1 month -> -2
        older / never -> 0
    """
    try:
        result = post(
            "device-swap/device-swap/v1/retrieve-date", {"phoneNumber": phone_number}
        )
        latest_change_str = result.get("latestDeviceChange")

        if not latest_change_str:
            return DeviceSwapSignal(False, None, 0, False, result)

        latest_change = datetime.fromisoformat(latest_change_str.replace("Z", "+00:00"))
        hours_since = (datetime.now(timezone.utc) - latest_change).total_seconds() / 3600

        if hours_since < 24:
            weight = -15
        elif hours_since < 24 * 7:
            weight = -8
        elif hours_since < 24 * 30:
            weight = -2
        else:
            weight = 0

        return DeviceSwapSignal(
            swapped_recently=hours_since < 24 * 30,
            hours_since_swap=round(hours_since, 2),
            weight=weight,
            degraded=False,
            raw_response=result,
        )
    except Exception as exc:
        print(f"[SendGuard] Device Swap retrieve-date failed: {exc}")
        return DeviceSwapSignal(
            swapped_recently=False,
            hours_since_swap=None,
            weight=0,
            degraded=True,
            raw_response={"error": str(exc)},
        )
        