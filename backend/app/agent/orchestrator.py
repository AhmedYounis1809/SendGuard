"""
SendGuard — AI Orchestrator (Gemini + Function Calling)

✅ Uses the STABLE `generate_content` API — deliberately NOT the new
Interactions API (`client.interactions.create`), because Google's own docs
state: "For stable production deployments, we recommend you continue to use
the generateContent API." Given this runs live in front of judges, we
prioritize stability over using the newest API surface.

ARCHITECTURE (locked in — see BACKLOG.md Phase C):
    This module's ONLY job is to decide WHICH CAMARA signal tool(s) are
    worth calling for a given transaction, and to actually call them.

    It does NOT compute the Trust Index or decide Allow/Verify/Hold/Freeze
    — that happens in trust_engine.py, which is 100% deterministic Python
    with zero LLM involvement. This split is intentional: financial risk
    math must be reproducible, not subject to LLM non-determinism.

We use Automatic Function Calling DISABLED and handle the tool-call loop
manually (rather than relying on the SDK's automatic execution + internal
history), because manual handling gives us full, certain control over
exactly what data we collect — important when every signal result feeds
directly into a financial decision.
"""

import os
from google import genai
from google.genai import types

from app.camara.sim_swap import get_sim_swap_score
from app.camara.device_swap import get_device_swap_score
from app.camara.location_verification import verify_location

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

_client = None


def get_client() -> genai.Client:
    """
    Returns a singleton Gemini client. `genai.Client()` automatically reads
    GEMINI_API_KEY (or GOOGLE_API_KEY) from the environment — no need to
    pass it explicitly if .env is loaded via python-dotenv at app startup.
    """
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
# Each function's docstring + type hints become the schema Gemini sees.
# These wrap our already-confirmed-working CAMARA modules — the LLM never
# talks to Nokia directly, it only ever sees a phone number and simple args.
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
        "weight": signal.weight,
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
        "weight": signal.weight,
        "degraded": signal.degraded,
    }


def check_location_tool(
    phone_number: str, expected_latitude: float, expected_longitude: float
) -> dict:
    """Verifies whether the user's device is currently within their expected
    /usual area (e.g. their home city). Only call this if an expected
    location is available for the user (skip for brand-new users with no
    location history yet).

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

# Maps the function name the model returns back to the real Python callable.
TOOL_MAP = {fn.__name__: fn for fn in AVAILABLE_TOOLS}


def decide_and_fetch_signals(transaction_context: dict, max_rounds: int = 4) -> dict:
    """
    The core Agent step — a REAL multi-turn Reason -> Tool -> Reason loop
    (fixed from an earlier version that only did a single-shot "plan all
    tools upfront, execute, stop" pass — that was NOT true ReAct behavior,
    since Gemini never saw any tool result before finishing).

    Now: Gemini sees the result of each round of tool calls BEFORE deciding
    whether it needs to call anything else. For example, it might check SIM
    Swap first, see it's clean, and decide that's sufficient for a small
    transaction — or see it's suspicious and decide to check Device Swap
    and Location too before finishing. This is genuine iterative reasoning,
    not a single upfront plan.

    Args:
        transaction_context: see module docstring example
        max_rounds: safety cap on the number of Reason->Tool round trips,
            so a live demo can never hang on a runaway loop (3 tools total
            exist, so 4 rounds is generous headroom, not a real limit on
            normal behavior)

    Returns:
        dict mapping tool name -> tool result (same shape as before) for
        every tool called across ALL rounds, for trust_engine.py to score.
    """
    client = get_client()

    prompt = f"""You are a fraud-risk orchestration agent for a financial
transaction security system called SendGuard. A transaction is about to be
processed with the following context:

{transaction_context}

You have tools available to check network-based risk signals. You do not
need to decide everything upfront: call one or more tools, look at the
result, and THEN decide whether you have enough evidence or need to check
something else. For example, if an early signal already looks clearly
risky or clearly clean, you may decide further checks aren't needed for a
small transaction — but for a large transaction or one to a new
beneficiary, be thorough. Only call the location check if
`has_location_history` is true. Once you believe you have sufficient
evidence, stop calling tools and simply confirm you're done."""

    contents = [types.Content(role="user", parts=[types.Part(text=prompt)])]
    collected_signals: dict = {}

    for round_num in range(max_rounds):
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
            # Gemini decided it has enough evidence — genuine stopping
            # condition, not just "ran out of a fixed plan."
            break

        # Record the model's turn (including its function-call requests)
        # in the conversation so it has memory of what it already asked for.
        contents.append(response.candidates[0].content)

        # Execute exactly the tools requested THIS round, and feed the
        # results back as the next turn — this is what lets Gemini reason
        # over real evidence before its next decision.
        function_response_parts = []
        for call in function_calls:
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

        contents.append(types.Content(role="tool", parts=function_response_parts))

    return collected_signals
    