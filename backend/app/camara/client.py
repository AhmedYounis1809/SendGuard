"""
SendGuard — Nokia Network-as-Code REST client.

CONFIRMED live by the team via PowerShell Invoke-WebRequest against a real
App Key in Simulator Mode, for THREE different APIs.

IMPORTANT DISCOVERY: not all APIs share the same base URL structure!

  - SIM Swap & Device Swap live under:
        https://network-as-code.p-eu.apihub.nokia.io/passthrough/camara/v1/{api}/{api}/{version}/{operation}
    (note: SIM Swap uses .../v0/..., Device Swap uses .../v1/...)

  - Location Verification lives under a DIFFERENT, shorter base:
        https://network-as-code.p-eu.apihub.nokia.io/location-verification/v0/{operation}

Because of this, `post()` accepts an explicit `base_url` so each signal
module can point at its own confirmed base instead of assuming one global
pattern.
"""

import os
import requests

NAC_API_KEY = os.getenv("NAC_API_KEY")
NAC_RAPIDAPI_HOST = os.getenv(
    "NAC_RAPIDAPI_HOST", "network-as-code.nokia.rapidapi.com"
)

# Confirmed base for SIM Swap / Device Swap
CAMARA_PASSTHROUGH_BASE = "https://network-as-code.p-eu.apihub.nokia.io/passthrough/camara/v1"

# Confirmed base for Location Verification (different structure!)
LOCATION_VERIFICATION_BASE = "https://network-as-code.p-eu.apihub.nokia.io/location-verification/v0"


def _headers() -> dict:
    if not NAC_API_KEY:
        raise RuntimeError(
            "NAC_API_KEY is not set. Copy backend/.env.example to backend/.env "
            "and add your Nokia Network-as-Code App Key before running."
        )
    return {
        "x-rapidapi-key": NAC_API_KEY,
        "x-rapidapi-host": NAC_RAPIDAPI_HOST,
        "Content-Type": "application/json",
    }


def post(path: str, body: dict, base_url: str = CAMARA_PASSTHROUGH_BASE, timeout: int = 10) -> dict:
    """
    Makes a POST call to a CAMARA endpoint.

    Args:
        path: e.g. "sim-swap/sim-swap/v0/check" or "verify" (for location)
        body: JSON-serializable request body
        base_url: defaults to the SIM Swap/Device Swap base; pass
                   LOCATION_VERIFICATION_BASE for location calls

    Returns:
        Parsed JSON response as a dict.

    Raises:
        requests.RequestException on failure — every caller in this package
        catches this and returns a "degraded" signal (see each module's
        `degraded` field) rather than crashing. trust_engine.py should lean
        toward Adaptive Verification, never a confident Allow, when any
        signal comes back degraded.
    """
    url = f"{base_url}/{path}"
    response = requests.post(url, headers=_headers(), json=body, timeout=timeout)
    response.raise_for_status()
    return response.json()
    