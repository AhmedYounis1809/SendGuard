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

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

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


def decide_and_fetch_signals(transaction_context: dict) -> dict:
    """
    The core Agent step: given transaction context, Gemini decides WHICH
    signal tools are worth calling for THIS specific transaction — it does
    not blindly call every tool every time. We then execute exactly the
    tools it requested ourselves (manual function calling, not automatic),
    and return the raw collected results for trust_engine.py to score.

    Args:
        transaction_context: e.g. {
            "phone_number": "+99999991000",
            "amount": 50000,
            "currency": "EGP",
            "is_new_beneficiary": True,
            "recent_transaction_count_10min": 1,
            "usual_latitude": 30.0444,
            "usual_longitude": 31.2357,
            "has_location_history": True,
        }

    Returns:
        dict mapping tool name -> tool result, e.g.:
        {
            "check_sim_swap_tool": {"swapped_recently": True, ...},
            "check_device_swap_tool": {"swapped_recently": False, ...},
        }
        (Tools the agent chose NOT to call simply won't be present as keys
        — trust_engine.py must treat a missing signal as "not checked",
        not as "safe".)
    """
    client = get_client()

    prompt = f"""You are a fraud-risk orchestration agent for a financial
transaction security system called SendGuard. A transaction is about to be
processed with the following context:

{transaction_context}

Decide which of the available tools are worth calling to assess this
transaction's risk. You do not need to call every tool for every
transaction. For example:
- A small, routine transaction to a frequent beneficiary may need little
  or no additional checking.
- A large transaction, or one to a new beneficiary, or one following
  unusual activity, should be checked thoroughly (SIM swap and device swap
  are cheap and valuable to check on most non-trivial transactions).
- Only call the location check if `has_location_history` is true — there's
  nothing to compare against otherwise.

Call the relevant tools now."""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=AVAILABLE_TOOLS,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        ),
    )

    function_calls = response.function_calls or []

    collected_signals = {}
    for call in function_calls:
        fn = TOOL_MAP.get(call.name)
        if fn is None:
            continue
        try:
            result = fn(**call.args)
            collected_signals[call.name] = result
        except Exception as exc:
            # Degraded Mode at the tool level: record the failure, don't crash.
            print(f"[SendGuard] Tool '{call.name}' failed: {exc}")
            collected_signals[call.name] = {"degraded": True, "error": str(exc)}

    return collected_signals
    