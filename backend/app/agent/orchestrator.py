"""
SendGuard — Tool definitions + policy guardrails.

Tool function signatures are EXACT and must never change — Pydantic AI
registers these unchanged via `tool_plain` (see llm_client.py), and the
deterministic fallback also calls these exact same functions directly.

Guardrails (duplicate-call prevention, location policy) now live INSIDE
the tool bodies rather than in an outer orchestration loop, because
Pydantic AI's Agent controls the tool-calling loop internally — there is
no outer loop for us to intercept calls in anymore. State is passed in via
contextvars (investigation_state.py), not via extra function parameters,
so the public signatures stay exactly as they were.
"""

from typing import Optional

from app.camara.sim_swap import get_sim_swap_score
from app.camara.device_swap import get_device_swap_score
from app.camara.location_verification import verify_location
from app.agent.demo_mode import get_demo_signal, NOT_DEMO_MODE
from app.agent.investigation_state import (
    transaction_context_var,
    checked_tools_var,
    collected_signals_var,
)


def _rejection_reason(call_name: str, transaction_context: dict) -> Optional[str]:
    """Python-side POLICY ENFORCEMENT — unchanged from before. Applies no
    matter which LLM provider (or no provider at all) is making the request."""
    if call_name == "check_location_tool":
        if not transaction_context.get("location_reference_available", False):
            return "no location reference available for this user"
        if transaction_context.get("usual_latitude") is None or transaction_context.get("usual_longitude") is None:
            return "location_reference_available is true but coordinates are missing"
    return None


def _already_checked(tool_name: str) -> bool:
    checked = checked_tools_var.get()
    return checked is not None and tool_name in checked


def _record(tool_name: str, result: dict) -> None:
    """Records a real (non-skipped) tool result into the shared per-request
    state, so investigate_transaction() can read it back after the Pydantic
    AI agent run completes."""
    checked = checked_tools_var.get()
    if checked is not None:
        checked.add(tool_name)
    signals = collected_signals_var.get()
    if signals is not None:
        signals[tool_name] = result


def check_sim_swap_tool(phone_number: str) -> dict:
    """Checks whether the user's SIM card was recently swapped, and how
    long ago. Use this for most transactions, especially higher-value ones,
    since SIM swap is a strong indicator of potential account takeover.

    Args:
        phone_number: the user's phone number in E.164 format
    """
    if _already_checked("check_sim_swap_tool"):
        return {"skipped": True, "reason": "already checked"}

    mock = get_demo_signal("check_sim_swap_tool")
    if mock is not NOT_DEMO_MODE:
        result = mock
    else:
        signal = get_sim_swap_score(phone_number)
        result = {
            "swapped_recently": signal.swapped_recently,
            "hours_since_swap": signal.hours_since_swap,
            "degraded": signal.degraded,
        }

    _record("check_sim_swap_tool", result)
    return result


def check_device_swap_tool(phone_number: str) -> dict:
    """Checks whether the user's phone number recently appeared on a new or
    different physical device.

    Args:
        phone_number: the user's phone number in E.164 format
    """
    if _already_checked("check_device_swap_tool"):
        return {"skipped": True, "reason": "already checked"}

    mock = get_demo_signal("check_device_swap_tool")
    if mock is not NOT_DEMO_MODE:
        result = mock
    else:
        signal = get_device_swap_score(phone_number)
        result = {
            "swapped_recently": signal.swapped_recently,
            "hours_since_swap": signal.hours_since_swap,
            "degraded": signal.degraded,
        }

    _record("check_device_swap_tool", result)
    return result


def check_location_tool(phone_number: str, expected_latitude: float, expected_longitude: float) -> dict:
    """Verifies whether the user's device is currently within their
    expected/usual area. Only call this if location_reference_available is
    true in the transaction context — it will be rejected otherwise.

    Args:
        phone_number: the user's phone number in E.164 format
        expected_latitude: latitude of the user's expected/usual location
        expected_longitude: longitude of the user's expected/usual location
    """
    if _already_checked("check_location_tool"):
        return {"skipped": True, "reason": "already checked"}

    ctx = transaction_context_var.get()
    if ctx is not None:
        reason = _rejection_reason("check_location_tool", ctx)
        if reason is not None:
            return {"skipped": True, "reason": reason}

    mock = get_demo_signal("check_location_tool")
    if mock is not NOT_DEMO_MODE:
        result = mock
    else:
        signal = verify_location(phone_number, expected_latitude, expected_longitude)
        result = {
            "verified": signal.verified,
            "verification_result": signal.verification_result,
            "degraded": signal.degraded,
        }

    _record("check_location_tool", result)
    return result


AVAILABLE_TOOLS = [check_sim_swap_tool, check_device_swap_tool, check_location_tool]
TOOL_MAP = {fn.__name__: fn for fn in AVAILABLE_TOOLS}


def decide_and_fetch_signals(transaction_context: dict) -> tuple[dict, str, Optional[str]]:
    """Returns (collected_signals, mode, fallback_reason). Delegates the
    actual LLM orchestration (Pydantic AI + Gemini/Groq/Deterministic) to
    llm_client.py."""
    from app.agent.llm_client import investigate_transaction
    return investigate_transaction(transaction_context, AVAILABLE_TOOLS, TOOL_MAP, _rejection_reason)