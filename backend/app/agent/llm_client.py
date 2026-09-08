"""
SendGuard — LLM Client with 3-tier reliability fallback.

INVESTIGATION layer: Pydantic AI Agent (approved agent framework) running
Gemini as primary model with Groq as an automatic fallback model via
Pydantic AI's built-in FallbackModel — falling further back to a
deterministic (no-LLM) investigation if both providers fail.

RECOMMENDATION layer: UNCHANGED from before (raw google-genai / groq SDK
calls) — this file's recommendation section was not part of the migration
scope and is preserved verbatim.
"""

import os
import json
from typing import Callable, Optional

from google import genai
from google.genai import types

try:
    from groq import Groq
    _GROQ_AVAILABLE = True
except ImportError:
    _GROQ_AVAILABLE = False

from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.models.fallback import FallbackModel
try:
    from pydantic_ai.exceptions import FallbackExceptionGroup
except ImportError:
    # Fallback import path in case the exception lives elsewhere in the
    # installed pydantic-ai version — report the exact ImportError if this
    # also fails, so the import path can be corrected quickly.
    from pydantic_ai.models.fallback import FallbackExceptionGroup

from app.agent.investigation_state import (
    transaction_context_var,
    checked_tools_var,
    collected_signals_var,
    reset_investigation_state,
)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

_gemini_client = None
_groq_client = None


def _get_gemini_client() -> genai.Client:
    """Used by the RECOMMENDATION layer only (unchanged) — the investigation
    layer now goes through Pydantic AI instead."""
    global _gemini_client
    if _gemini_client is None:
        if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY not configured")
        _gemini_client = genai.Client()
    return _gemini_client


def _get_groq_client():
    """Used by the RECOMMENDATION layer only (unchanged)."""
    global _groq_client
    if not _GROQ_AVAILABLE:
        raise RuntimeError("groq package not installed (pip install groq)")
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not configured")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


# ===========================================================================
# INVESTIGATION — Pydantic AI Agent (Gemini primary, Groq fallback via
# FallbackModel), deterministic investigation as the final safety net.
# ===========================================================================

_investigation_agent: Optional[Agent] = None


def _get_investigation_agent(available_tools: list) -> Agent:
    """
    Builds the Pydantic AI investigation Agent once and caches it.

    FallbackModel tries `gemini_model` first; on a ModelAPIError (rate
    limits, 5xx, timeouts — the default `fallback_on` behavior) it
    automatically retries the same request against `groq_model`. If BOTH
    fail, Pydantic AI raises a FallbackExceptionGroup, which we catch in
    investigate_transaction() to drop to the deterministic path.

    Tools are registered via `tool_plain` (not `tool`) specifically because
    the existing tool functions must keep their exact original signatures
    (no RunContext parameter) — see orchestrator.py's docstring.
    """
    global _investigation_agent
    if _investigation_agent is None:
        gemini_model = GoogleModel(GEMINI_MODEL)
        groq_model = GroqModel(GROQ_MODEL)
        fallback_model = FallbackModel(gemini_model, groq_model)

        agent = Agent(fallback_model)
        for tool_fn in available_tools:
            agent.tool_plain(tool_fn)

        _investigation_agent = agent
    return _investigation_agent


def _infer_investigation_mode(result) -> str:
    """
    Best-effort introspection of which model in the FallbackModel chain
    actually produced the final response, purely for transparency in the
    demo UI (does not affect correctness of the investigation itself,
    which already succeeded either way by the time this runs).
    """
    try:
        for message in reversed(result.all_messages()):
            model_name = getattr(message, "model_name", None)
            if not model_name:
                continue
            if GEMINI_MODEL in model_name or "gemini" in model_name.lower():
                return "AI_GEMINI"
            if GROQ_MODEL in model_name or "groq" in model_name.lower():
                return "AI_GROQ_FALLBACK"
            return f"AI_PYDANTIC:{model_name}"
    except Exception as exc:
        print(f"[SendGuard][LLM] Could not introspect which model handled the request: {exc}")
    return "AI_PYDANTIC"


def _deterministic_investigate(transaction_context, tool_map, rejection_check_fn) -> dict:
    """UNCHANGED — the existing deterministic investigation fallback, calling
    the exact same tool functions directly."""
    phone_number = transaction_context.get("phone_number")
    collected_signals = {}
    for name in ["check_sim_swap_tool", "check_device_swap_tool", "check_location_tool"]:
        if rejection_check_fn(name, transaction_context) is not None:
            continue
        fn = tool_map.get(name)
        if fn is None:
            continue
        try:
            if name == "check_location_tool":
                result = fn(
                    phone_number=phone_number,
                    expected_latitude=transaction_context.get("usual_latitude"),
                    expected_longitude=transaction_context.get("usual_longitude"),
                )
            else:
                result = fn(phone_number=phone_number)
        except Exception as exc:
            result = {"degraded": True, "error": str(exc)}
        collected_signals[name] = result
    return collected_signals


def investigate_transaction(transaction_context, available_tools, tool_map, rejection_check_fn) -> tuple[dict, str, Optional[str]]:
    """Returns (collected_signals, mode, fallback_reason)."""
    reset_investigation_state(transaction_context)

    prompt = f"""You are a fraud-risk INVESTIGATION agent for a financial
transaction security system called SendGuard. Transaction context:

{transaction_context}

You have tools to gather network-based evidence. Call one or more tools,
look at the result, and THEN decide whether you have enough evidence or
need to check something else. Be thorough for large transactions or new
beneficiaries; a small routine transaction may need less checking.

Only request the location check if `location_reference_available` is true
in the context above — it will be rejected otherwise. Never request a tool
already successfully checked in this conversation.

You gather EVIDENCE ONLY — you do not calculate risk scores or make the
final decision. Once you have sufficient evidence, stop calling tools and
simply confirm you're done."""

    try:
        print("[SendGuard][LLM] Investigation: running Pydantic AI agent (Gemini primary, Groq fallback)...")
        agent = _get_investigation_agent(available_tools)
        result = agent.run_sync(prompt)
        signals = collected_signals_var.get() or {}
        mode = _infer_investigation_mode(result)
        reason = None if mode == "AI_GEMINI" else "Gemini unavailable — Pydantic AI's FallbackModel used Groq"
        print(f"[SendGuard][LLM] Investigation SOURCE = {mode}")
        return signals, mode, reason
    except FallbackExceptionGroup as exc:
        print(f"[SendGuard][LLM] Investigation: both Gemini and Groq failed via Pydantic AI ({exc}). Using deterministic fallback...")
    except Exception as exc:
        # Any other unexpected error (e.g. a Pydantic AI/library issue) —
        # do not let the whole request crash, drop to deterministic instead.
        print(f"[SendGuard][LLM] Investigation: Pydantic AI agent raised an unexpected error ({exc}). Using deterministic fallback...")

    reset_investigation_state(transaction_context)  # clean slate before the deterministic pass
    signals = _deterministic_investigate(transaction_context, tool_map, rejection_check_fn)
    print("[SendGuard][LLM] Investigation SOURCE = DETERMINISTIC (no LLM available)")
    return signals, "DETERMINISTIC_FALLBACK", "Both Gemini and Groq were unavailable"


# ===========================================================================
# RECOMMENDATION — UNCHANGED (not part of the Pydantic AI migration scope)
# ===========================================================================

def _build_action_prompt(tier, transaction_context, degraded_signals, reasons, allowed) -> str:
    return f"""A transaction has been assessed at risk tier: {tier}

Evidence gathered:
{chr(10).join(f"- {r}" for r in reasons) if reasons else "- (no specific evidence recorded)"}

Degraded/unavailable signals: {degraded_signals or "none"}
Trusted previous device available: {transaction_context.get("trusted_device_available", False)}

Allowed actions for this tier: {allowed}

Choose the option that best fits this evidence. A trusted device channel
is generally stronger than a same-device confirmation; prefer the more
cautious option if signals are degraded."""


def _gemini_choose_action(tier, transaction_context, degraded_signals, reasons, allowed) -> str:
    client = _get_gemini_client()
    choose_action_fn = types.FunctionDeclaration(
        name="choose_action",
        description="Selects the most appropriate security action for this transaction.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "action": types.Schema(type="STRING", enum=allowed),
                "justification": types.Schema(type="STRING"),
            },
            required=["action"],
        ),
    )
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=_build_action_prompt(tier, transaction_context, degraded_signals, reasons, allowed),
        config=types.GenerateContentConfig(
            tools=[types.Tool(function_declarations=[choose_action_fn])],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )
    for call in response.function_calls or []:
        if call.name == "choose_action":
            return call.args.get("action")
    raise RuntimeError("Gemini did not return a tool call")


def _groq_choose_action(tier, transaction_context, degraded_signals, reasons, allowed) -> str:
    client = _get_groq_client()
    tool_schema = [{"type": "function", "function": {
        "name": "choose_action",
        "description": "Selects the most appropriate security action.",
        "parameters": {"type": "object", "properties": {"action": {"type": "string", "enum": allowed}}, "required": ["action"]},
    }}]
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": _build_action_prompt(tier, transaction_context, degraded_signals, reasons, allowed)}],
        tools=tool_schema,
        tool_choice="auto",
    )
    message = response.choices[0].message
    for call in message.tool_calls or []:
        if call.function.name == "choose_action":
            return json.loads(call.function.arguments).get("action")
    raise RuntimeError("Groq did not return a tool call")


def _deterministic_choose_action(tier, transaction_context) -> str:
    trusted = transaction_context.get("trusted_device_available", False)
    if tier == "ALLOW":
        return "ALLOW"
    if tier == "ADAPTIVE_VERIFICATION":
        return "TRUSTED_DEVICE_CONFIRMATION" if trusted else "TRANSACTION_CONFIRMATION"
    if tier == "TRANSACTION_HOLD":
        return "OUT_OF_BAND_VERIFICATION" if trusted else "TEMPORARY_SAFETY_HOLD"
    if tier == "TEMPORARY_FREEZE":
        return "TEMPORARY_FREEZE_MANUAL_REVIEW"
    return "TEMPORARY_SAFETY_HOLD"


def choose_action(tier, transaction_context, degraded_signals, reasons, allowed_actions) -> tuple[str, str, Optional[str]]:
    """Returns (action, mode, fallback_reason)."""
    if len(allowed_actions) == 1:
        return allowed_actions[0], "DETERMINISTIC_ONLY_OPTION", None

    try:
        print("[SendGuard][LLM] Recommendation: trying Gemini...")
        action = _gemini_choose_action(tier, transaction_context, degraded_signals, reasons, allowed_actions)
        if action in allowed_actions:
            print("[SendGuard][LLM] Recommendation SOURCE = GEMINI (success)")
            return action, "AI_GEMINI", None
        print(f"[SendGuard][LLM] Gemini returned invalid action '{action}'.")
        gemini_error = f"invalid action returned: {action}"
    except Exception as exc:
        gemini_error = str(exc)
        print(f"[SendGuard][LLM] Recommendation: Gemini FAILED ({gemini_error}). Trying Groq...")

    try:
        action = _groq_choose_action(tier, transaction_context, degraded_signals, reasons, allowed_actions)
        if action in allowed_actions:
            print("[SendGuard][LLM] Recommendation SOURCE = GROQ (fallback success)")
            return action, "AI_GROQ_FALLBACK", f"Gemini failed: {gemini_error}"
        print(f"[SendGuard][LLM] Groq returned invalid action '{action}'.")
        groq_error = f"invalid action returned: {action}"
    except Exception as exc:
        groq_error = str(exc)
        print(f"[SendGuard][LLM] Recommendation: Groq FAILED ({groq_error}). Using deterministic fallback...")

    action = _deterministic_choose_action(tier, transaction_context)
    print("[SendGuard][LLM] Recommendation SOURCE = DETERMINISTIC (no LLM available)")
    return action, "DETERMINISTIC_FALLBACK", f"Gemini failed: {gemini_error} | Groq failed: {groq_error}"