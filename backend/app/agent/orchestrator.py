"""
SendGuard — AI Orchestrator (Gemini + Function Calling)

ROLE (important — repeat this in documentation/pitch, judges will ask):
    This module is an INVESTIGATION agent, not a risk-decision agent. Its
    only job is to decide WHICH CAMARA network signals are worth gathering
    for a given transaction, gather them across one or more reasoning
    rounds, and hand raw EVIDENCE to trust_engine.py.

    It does NOT compute risk weights, a Trust Index, or an
    Allow/Verify/Hold/Freeze decision — that math lives entirely in
    trust_engine.py, 100% deterministic Python, zero LLM involvement. The
    model proposes which evidence to collect; the code enforces policy and
    does all arithmetic. "The AI is the investigator, Python is the judge."

API CHOICE: we use `generate_content` with explicit manual function-calling
control (automatic_function_calling disabled) for predictable,
fully-inspectable tool execution — not because we're claiming Google brands
this as "the" recommended production endpoint (that framing shifts as
Google's docs evolve), but because manual control gives us certainty over
exactly what data reaches the model and exactly what gets executed, which
matters for a pipeline that influences real money movement.

MULTI-TURN LOOP: Gemini sees the result of each round of tool calls BEFORE
deciding whether it needs anything else — genuine Reason -> Tool -> Reason
-> Tool behavior, not a single upfront plan executed all at once.

PYTHON-ENFORCED GUARDRAILS (the model can request, but never override):
  - A tool already successfully checked this session will not be
    re-executed even if requested again.
  - check_location_tool only ever executes if
    transaction_context["has_location_history"] is True — the model may
    ask, but the code refuses if the precondition isn't met.
"""

import os
from typing import Optional
from google import genai
from google.genai import types

from app.camara.sim_swap import get_sim_swap_score
from app.camara.device_swap import get_device_swap_score
from app.camara.location_verification import verify_location

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

_client = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Copy backend/.env.example to "
                "backend/.env and add your Gemini API key before running."
            )
        _client = genai.Client()
    return _client


# ---------------------------------------------------------------------------
# TOOLS exposed to the LLM.
# IMPORTANT: these return EVIDENCE ONLY — never a pre-computed risk weight.
# Weight/scoring math belongs exclusively to trust_engine.py. Leaking a
# "weight" number into what the LLM sees would let the model indirectly
# influence the risk model, which we don't want.
# ---------------------------------------------------------------------------

def check_sim_swap_tool(phone_number: str) -> dict:
    """Checks whether the user's SIM card was recently swapped, and how
    long ago. Use this for most transactions, especially higher-value ones,
    since SIM swap is a strong indicator of potential account takeover.

    Args:
        phone_number: the user's phone number in E.164 format,
            e.g. +201234567890
    """
    signal = get_sim_swap_score(phone_number)
    return {
        "swapped_recently": signal.swapped_recently,
        "hours_since_swap": signal.hours_since_swap,
        "degraded": signal.degraded,
    }


def check_device_swap_tool(phone_number: str) -> dict:
    """Checks whether the user's phone number recently appeared on a new or
    different physical device. Use this alongside the SIM swap check to
    detect potential account takeover.

    Args:
        phone_number: the user's phone number in E.164 format
    """
    signal = get_device_swap_score(phone_number)
    return {
        "swapped_recently": signal.swapped_recently,
        "hours_since_swap": signal.hours_since_swap,
        "degraded": signal.degraded,
    }


def check_location_tool(
    phone_number: str, expected_latitude: float, expected_longitude: float
) -> dict:
    """Verifies whether the user's device is currently within their
    expected/usual area (e.g. their home city). Only call this if an
    expected location is available for the user — the system will refuse
    this check otherwise (skip for brand-new users with no location
    history yet).

    Args:
        phone_number: the user's phone number in E.164 format
        expected_latitude: latitude of the user's expected/usual location
        expected_longitude: longitude of the user's expected/usual location
    """
    signal = verify_location(phone_number, expected_latitude, expected_longitude)
    return {
        "verified": signal.verified,
        "verification_result": signal.verification_result,
        "degraded": signal.degraded,
    }


AVAILABLE_TOOLS = [check_sim_swap_tool, check_device_swap_tool, check_location_tool]
TOOL_MAP = {fn.__name__: fn for fn in AVAILABLE_TOOLS}


def _rejection_reason(call_name: str, transaction_context: dict) -> Optional[str]:
    """
    Python-side POLICY ENFORCEMENT. The model can REQUEST any tool, but the
    code decides whether it's actually permitted to run. Returns None if
    allowed, or a short reason string if rejected.

    Principle: never trust the model with policy enforcement. The model
    proposes; the code enforces. This must never live in the prompt alone.
    """
    if call_name == "check_location_tool" and not transaction_context.get(
        "has_location_history", False
    ):
        return "no location history on file for this user"
    return None


def decide_and_fetch_signals(transaction_context: dict, max_rounds: int = 4) -> dict:
    """
    Multi-turn Reason -> Tool -> Reason loop. See module docstring for the
    full design rationale.

    Args:
        transaction_context: e.g. {
            "phone_number": "+99999991000", "amount": 50000,
            "is_new_beneficiary": True, "has_location_history": True,
            "usual_latitude": 30.0444, "usual_longitude": 31.2357, ...
        }
        max_rounds: safety cap on Reason->Tool round trips (only 3 tools
            exist, so 4 rounds is generous headroom, not a real limit on
            normal behavior) — this guarantees the live demo can never hang.

    Returns:
        dict mapping tool name -> EVIDENCE-ONLY result (no weights).
        Tools never called simply won't be present as keys —
        trust_engine.py must treat a missing signal as "not checked,"
        never as "safe."
    """
    client = get_client()

    prompt = f"""You are a fraud-risk INVESTIGATION agent for a financial
transaction security system called SendGuard. A transaction is about to be
processed with the following context:

{transaction_context}

You have tools available to gather network-based evidence. You do not need
to decide everything upfront: call one or more tools, look at the result,
and THEN decide whether you have enough evidence or need to check
something else. For example, if an early signal already looks clearly
risky or clearly clean, you may decide further checks aren't needed for a
small transaction — but for a large transaction or one to a new
beneficiary, be thorough.

Only request the location check if `has_location_history` is true in the
context above — it will be rejected otherwise. Never request a tool that
has already been successfully checked in this conversation unless there's
a specific new reason to recheck it.

You are gathering EVIDENCE ONLY — you do not calculate risk scores or make
the final Allow/Verify/Hold/Freeze decision; a separate deterministic
system does that using the evidence you collect. Once you believe you have
sufficient evidence, stop calling tools and simply confirm you're done."""

    contents = [types.Content(role="user", parts=[types.Part(text=prompt)])]
    collected_signals: dict = {}

    for _round in range(max_rounds):
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                tools=AVAILABLE_TOOLS,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            ),
        )

        function_calls = response.function_calls or []
        if not function_calls:
            break  # Gemini decided it has enough evidence — real stopping condition.

        contents.append(response.candidates[0].content)

        function_response_parts = []
        for call in function_calls:
            # --- Guardrail 1: duplicate-call protection ---
            if call.name in collected_signals:
                function_response_parts.append(
                    types.Part.from_function_response(
                        name=call.name,
                        response={"skipped": True, "reason": "already checked this session"},
                    )
                )
                continue

            # --- Guardrail 2: policy enforcement — code decides, not the model ---
            reason = _rejection_reason(call.name, transaction_context)
            if reason is not None:
                function_response_parts.append(
                    types.Part.from_function_response(
                        name=call.name,
                        response={"skipped": True, "reason": reason},
                    )
                )
                continue

            fn = TOOL_MAP.get(call.name)
            if fn is None:
                continue

            try:
                result = fn(**call.args)
            except Exception as exc:
                print(f"[SendGuard] Tool '{call.name}' failed: {exc}")
                result = {"degraded": True, "error": str(exc)}

            collected_signals[call.name] = result
            function_response_parts.append(
                types.Part.from_function_response(name=call.name, response=result)
            )

        contents.append(types.Content(role="user", parts=function_response_parts))

    return collected_signals
