"""
SendGuard — Location Verification signal.

✅ FULLY CONFIRMED — tested live by the team (Location Verification v0.2.0).

IMPORTANT: this API lives under a DIFFERENT base URL than SIM Swap/Device
Swap — see client.py's LOCATION_VERIFICATION_BASE.

Confirmed operation:

    POST verify   (full URL: {LOCATION_VERIFICATION_BASE}/verify)
        body: {
            "device": {"phoneNumber": "..."},
            "area": {
                "areaType": "CIRCLE",
                "center": {"latitude": ..., "longitude": ...},
                "radius": <meters>
            }
        }
        response: {
            "verificationResult": "TRUE" | "FALSE" | (possibly "PARTIAL"),
            "lastLocationTime": "<timestamp, no trailing Z observed>"
        }

⚠️ Note `verificationResult` is a STRING enum, not a real boolean — do not
use truthy checks on it directly (the string "FALSE" is truthy in Python!).

Verified test case: phoneNumber "+99999991000" checked against a circle
centered on Bonn, Germany (50.735851, 7.10066) with a 50km radius ->
verificationResult: "FALSE", lastLocationTime: "2026-08-30T01:41:04.822682"
"""

from dataclasses import dataclass
from typing import Optional
from .client import post, LOCATION_VERIFICATION_BASE


@dataclass
class LocationVerificationSignal:
    verified: bool                  # True only if verificationResult == "TRUE"
    verification_result: str        # raw enum string, useful for logging/explainability
    last_location_time: Optional[str]
    degraded: bool
    raw_response: dict


def verify_location(
    phone_number: str,
    latitude: float,
    longitude: float,
    radius_meters: int = 50000,
) -> LocationVerificationSignal:
    """
    Checks whether the device is within `radius_meters` of the given
    (latitude, longitude) — e.g. the user's "usual city" center from their
    Behavioral Profile.

    For Cold Start users with no profile yet, callers should either skip
    this signal (treat as neutral/degraded) or use a wide, country-level
    radius as a soft default.
    """
    try:
        body = {
            "device": {"phoneNumber": phone_number},
            "area": {
                "areaType": "CIRCLE",
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": radius_meters,
            },
        }
        result = post("verify", body, base_url=LOCATION_VERIFICATION_BASE)
        verification_result = result.get("verificationResult", "UNKNOWN")

        return LocationVerificationSignal(
            verified=(verification_result == "TRUE"),
            verification_result=verification_result,
            last_location_time=result.get("lastLocationTime"),
            degraded=False,
            raw_response=result,
        )
    except Exception as exc:
        print(f"[SendGuard] Location Verification failed: {exc}")
        return LocationVerificationSignal(
            verified=False,
            verification_result="ERROR",
            last_location_time=None,
            degraded=True,
            raw_response={"error": str(exc)},
        )
        