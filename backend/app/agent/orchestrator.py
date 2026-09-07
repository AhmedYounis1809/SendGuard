"""SendGuard — Tool definitions + policy guardrails (LLM calling lives in llm_client.py)."""

from typing import Optional

from app.camara.sim_swap import get_sim_swap_score
from app.camara.device_swap import get_device_swap_score
from app.camara.location_verification import verify_location
from app.agent.llm_client import investigate_transaction
from app.agent.demo_mode import get_demo_signal, NOT_DEMO_MODE


def check_sim_swap_tool(phone_number: str) -> dict:
    """Checks whether the user's SIM card was recently swapped, and how long ago.
    Args:
        phone_number: the user's phone number in E.164 format
    """
    mock = get_demo_signal("check_sim_swap_tool")
    if mock is not NOT_DEMO_MODE:
        return mock
    signal = get_sim_swap_score(phone_number)
    return {"swapped_recently": signal.swapped_recently, "hours_since_swap": signal.hours_since_swap, "degraded": signal.degraded}


def check_device_swap_tool(phone_number: str) -> dict:
    """Checks whether the user's phone number recently appeared on a new device.
    Args:
        phone_number: the user's phone number in E.164 format
    """
    mock = get_demo_signal("check_device_swap_tool")
    if mock is not NOT_DEMO_MODE:
        return mock
    signal = get_device_swap_score(phone_number)
    return {"swapped_recently": signal.swapped_recently, "hours_since_swap": signal.hours_since_swap, "degraded": signal.degraded}


def check_location_tool(phone_number: str, expected_latitude: float, expected_longitude: float) -> dict:
    """Verifies whether the device is within the expected/usual area. Only call if location_reference_available is true.
    Args:
        phone_number: the user's phone number in E.164 format
        expected_latitude: latitude of the user's expected/usual location
        expected_longitude: longitude of the user's expected/usual location
    """
    mock = get_demo_signal("check_location_tool")
    if mock is not NOT_DEMO_MODE:
        return mock
    signal = verify_location(phone_number, expected_latitude, expected_longitude)
    return {"verified": signal.verified, "verification_result": signal.verification_result, "degraded": signal.degraded}


AVAILABLE_TOOLS = [check_sim_swap_tool, check_device_swap_tool, check_location_tool]
TOOL_MAP = {fn.__name__: fn for fn in AVAILABLE_TOOLS}


def _rejection_reason(call_name: str, transaction_context: dict) -> Optional[str]:
    """Python-side POLICY ENFORCEMENT — applies to every LLM provider, and the deterministic path too."""
    if call_name == "check_location_tool":
        if not transaction_context.get("location_reference_available", False):
            return "no location reference available for this user"
        if transaction_context.get("usual_latitude") is None or transaction_context.get("usual_longitude") is None:
            return "location_reference_available is true but coordinates are missing"
    return None


def decide_and_fetch_signals(transaction_context: dict) -> tuple[dict, str, str]:
    """Returns (collected_signals, mode, fallback_reason)."""
    return investigate_transaction(transaction_context, AVAILABLE_TOOLS, TOOL_MAP, _rejection_reason)