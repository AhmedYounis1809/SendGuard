"""
SendGuard — LLM Client with 3-tier reliability fallback.
Single source of truth for every LLM call (Gemini -> Groq -> Deterministic).
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

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

_gemini_client = None
_groq_client = None


def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY not configured")
        _gemini_client = genai.Client()
    return _gemini_client


def _get_groq_client():
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
# INVESTIGATION
# ===========================================================================

def _gemini_investigate(transaction_context, available_tools, tool_map, rejection_check_fn, max_rounds=4) -> dict:
    client = _get_gemini_client()
    prompt = f"""You are a fraud-risk INVESTIGATION agent for a financial
transaction security system called SendGuard. Transaction context:

{transaction_context}

You have tools to gather network-based evidence. Call one or more tools,
look at the result, and decide whether more evidence is needed. Be
thorough for large transactions or new beneficiaries; a small routine
transaction may need less checking.

Only request the location check if `location_reference_available` is true
in the context above — it will be rejected otherwise. Never request a tool
already successfully checked in this conversation.

You gather EVIDENCE ONLY — you do not calculate risk scores or make the
final decision. Once you have sufficient evidence, stop calling tools."""

    contents = [types.Content(role="user", parts=[types.Part(text=prompt)])]
    collected_signals: dict = {}

    for _round in range(max_rounds):
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                tools=available_tools,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        function_calls = response.function_calls or []
        if not function_calls:
            break
        contents.append(response.candidates[0].content)

        function_response_parts = []
        for call in function_calls:
            if call.name in collected_signals:
                function_response_parts.append(types.Part.from_function_response(
                    name=call.name, response={"skipped": True, "reason": "already checked"}))
                continue
            reason = rejection_check_fn(call.name, transaction_context)
            if reason is not None:
                function_response_parts.append(types.Part.from_function_response(
                    name=call.name, response={"skipped": True, "reason": reason}))
                continue
            fn = tool_map.get(call.name)
            if fn is None:
                continue
            try:
                result = fn(**call.args)
            except Exception as exc:
                result = {"degraded": True, "error": str(exc)}
            collected_signals[call.name] = result
            function_response_parts.append(types.Part.from_function_response(name=call.name, response=result))

        contents.append(types.Content(role="user", parts=function_response_parts))

    return collected_signals


GROQ_INVESTIGATION_TOOLS_SCHEMA = [
    {"type": "function", "function": {
        "name": "check_sim_swap_tool",
        "description": "Checks whether the user's SIM card was recently swapped, and how long ago.",
        "parameters": {"type": "object", "properties": {"phone_number": {"type": "string"}}, "required": ["phone_number"]},
    }},
    {"type": "function", "function": {
        "name": "check_device_swap_tool",
        "description": "Checks whether the user's phone number recently appeared on a new device.",
        "parameters": {"type": "object", "properties": {"phone_number": {"type": "string"}}, "required": ["phone_number"]},
    }},
    {"type": "function", "function": {
        "name": "check_location_tool",
        "description": "Verifies whether the device is within the expected area. Only call if location_reference_available is true.",
        "parameters": {"type": "object", "properties": {
            "phone_number": {"type": "string"},
            "expected_latitude": {"type": "number"},
            "expected_longitude": {"type": "number"},
        }, "required": ["phone_number", "expected_latitude", "expected_longitude"]},
    }},
]


def _groq_investigate(transaction_context, tool_map, rejection_check_fn) -> dict:
    client = _get_groq_client()
    prompt = f"""You are a fraud-risk investigation agent. Transaction context:

{transaction_context}

Call whichever available tools are worth checking (SIM swap and device
swap are cheap and valuable for most non-trivial transactions; only call
location if location_reference_available is true)."""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        tools=GROQ_INVESTIGATION_TOOLS_SCHEMA,
        tool_choice="auto",
    )
    message = response.choices[0].message
    tool_calls = message.tool_calls or []

    collected_signals = {}
    for call in tool_calls:
        name = call.function.name
        try:
            args = json.loads(call.function.arguments)
        except Exception:
            args = {}
        if rejection_check_fn(name, transaction_context) is not None:
            continue
        fn = tool_map.get(name)
        if fn is None:
            continue
        try:
            result = fn(**args)
        except Exception as exc:
            result = {"degraded": True, "error": str(exc)}
        collected_signals[name] = result

    return collected_signals


def _deterministic_investigate(transaction_context, tool_map, rejection_check_fn) -> dict:
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
    try:
        print("[SendGuard][LLM] Investigation: trying Gemini...")
        signals = _gemini_investigate(transaction_context, available_tools, tool_map, rejection_check_fn)
        print("[SendGuard][LLM] Investigation SOURCE = GEMINI (success)")
        return signals, "AI_GEMINI", None
    except Exception as exc:
        gemini_error = str(exc)
        print(f"[SendGuard][LLM] Investigation: Gemini FAILED ({gemini_error}). Trying Groq...")

    try:
        signals = _groq_investigate(transaction_context, tool_map, rejection_check_fn)
        print("[SendGuard][LLM] Investigation SOURCE = GROQ (fallback success)")
        return signals, "AI_GROQ_FALLBACK", f"Gemini failed: {gemini_error}"
    except Exception as exc:
        groq_error = str(exc)
        print(f"[SendGuard][LLM] Investigation: Groq FAILED ({groq_error}). Using deterministic fallback...")

    signals = _deterministic_investigate(transaction_context, tool_map, rejection_check_fn)
    print("[SendGuard][LLM] Investigation SOURCE = DETERMINISTIC (no LLM available)")
    return signals, "DETERMINISTIC_FALLBACK", f"Gemini failed: {gemini_error} | Groq failed: {groq_error}"


# ===========================================================================
# RECOMMENDATION
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