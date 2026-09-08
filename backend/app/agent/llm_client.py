"""
SendGuard — LLM Client with resilient investigation fallback.

INVESTIGATION layer: Pydantic AI Agent using:
    Gemini attempt #1
        -> Gemini retry
        -> Groq fallback
        -> Groq retry
        -> deterministic fallback

RECOMMENDATION layer: UNCHANGED from before (raw google-genai / groq SDK
calls) — this section is intentionally preserved.
"""

import os
import json
import contextvars
import queue
import threading
import time
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

from app.agent.investigation_state import (
    transaction_context_var,
    checked_tools_var,
    collected_signals_var,
    reset_investigation_state,
)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

# Investigation timeout/retry settings.
#
# Maximum LLM waiting time:
#   Gemini #1 = 12s
#   Gemini #2 = 12s
#   Groq   #1 = 10s
#   Groq   #2 = 10s
#   Total   = 44s + tiny retry delays
#
# These can be overridden from .env if needed.
GEMINI_ATTEMPT_TIMEOUT = float(
    os.getenv("SENDGUARD_GEMINI_ATTEMPT_TIMEOUT", "12")
)
GROQ_ATTEMPT_TIMEOUT = float(
    os.getenv("SENDGUARD_GROQ_ATTEMPT_TIMEOUT", "10")
)

GEMINI_MAX_ATTEMPTS = int(
    os.getenv("SENDGUARD_GEMINI_ATTEMPTS", "2")
)
GROQ_MAX_ATTEMPTS = int(
    os.getenv("SENDGUARD_GROQ_ATTEMPTS", "2")
)

RETRY_DELAY = float(
    os.getenv("SENDGUARD_LLM_RETRY_DELAY", "0.25")
)

_gemini_client = None
_groq_client = None


def _get_gemini_client() -> genai.Client:
    """Used by the RECOMMENDATION layer only (unchanged)."""
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
# INVESTIGATION — Pydantic AI Agent
# ===========================================================================

# We intentionally keep Gemini and Groq as separate Agents instead of using
# one Pydantic AI FallbackModel.
#
# This gives us explicit control over:
#
#   Gemini #1 -> Gemini #2 -> Groq #1 -> Groq #2 -> deterministic
#
# and allows us to protect each provider attempt with its own wall-clock
# timeout.
_investigation_agents: dict[str, Agent] = {}


def _get_investigation_agent(
    provider: str,
    available_tools: list,
) -> Agent:
    """
    Builds/caches one Pydantic AI investigation Agent per provider.

    tool_plain() is intentionally used because the existing CAMARA tool
    functions must keep their exact signatures without RunContext.
    """
    tool_key = ",".join(
        sorted(
            getattr(tool_fn, "__name__", repr(tool_fn))
            for tool_fn in available_tools
        )
    )
    cache_key = f"{provider}:{tool_key}"

    if cache_key in _investigation_agents:
        return _investigation_agents[cache_key]

    if provider == "gemini":
        model = GoogleModel(GEMINI_MODEL)
    elif provider == "groq":
        model = GroqModel(GROQ_MODEL)
    else:
        raise ValueError(f"Unsupported investigation provider: {provider}")

    agent = Agent(model)

    for tool_fn in available_tools:
        agent.tool_plain(tool_fn)

    _investigation_agents[cache_key] = agent
    return agent


def _infer_investigation_mode(result, provider: str) -> str:
    """
    Best-effort introspection of which provider produced the result.
    """
    try:
        for message in reversed(result.all_messages()):
            model_name = getattr(message, "model_name", None)
            if not model_name:
                continue

            model_name = str(model_name)

            if "gemini" in model_name.lower():
                return "AI_GEMINI"

            if "groq" in model_name.lower():
                return "AI_GROQ_FALLBACK"

    except Exception as exc:
        print(
            "[SendGuard][LLM] Could not introspect which model "
            f"handled the request: {exc}"
        )

    return "AI_GEMINI" if provider == "gemini" else "AI_GROQ_FALLBACK"


def _run_with_timeout(
    fn: Callable[[], object],
    timeout_seconds: float,
):
    """
    Run a synchronous provider call with a wall-clock timeout.

    Returns:
        (True, result, None)  on success
        (False, None, error)  on failure/timeout

    Python cannot safely kill an arbitrary running thread, so a timed-out
    provider call may continue in the background. The SendGuard request does
    not wait for it anymore, and each attempt uses its own ContextVar context.
    """
    result_queue = queue.Queue(maxsize=1)

    # Copy the caller's context BEFORE creating the worker so request-local
    # demo state and other ContextVars are available inside the worker.
    caller_context = contextvars.copy_context()

    def worker():
        try:
            result = caller_context.run(fn)
            result_queue.put(("ok", result))
        except BaseException as exc:
            try:
                result_queue.put(("error", exc))
            except queue.Full:
                pass

    thread = threading.Thread(
        target=worker,
        name="sendguard-llm-attempt",
        daemon=True,
    )
    thread.start()

    try:
        status, value = result_queue.get(
            timeout=max(0.1, timeout_seconds)
        )
    except queue.Empty:
        return (
            False,
            None,
            TimeoutError(
                f"provider timed out after {timeout_seconds:.1f}s"
            ),
        )

    if status == "ok":
        return True, value, None

    return False, None, value


def _run_provider_attempt(
    provider: str,
    attempt: int,
    transaction_context,
    prompt: str,
    available_tools: list,
    timeout_seconds: float,
):
    """
    Runs exactly one bounded Pydantic AI provider attempt.
    """
    print(
        f"[SendGuard][LLM] Investigation: "
        f"{provider.upper()} attempt {attempt} "
        f"(timeout={timeout_seconds:.1f}s)..."
    )

    agent = _get_investigation_agent(
        provider,
        available_tools,
    )

    def run_agent():
        # Every attempt starts from clean investigation state.
        reset_investigation_state(transaction_context)

        result = agent.run_sync(prompt)

        signals = collected_signals_var.get() or {}

        return result, dict(signals)

    started = time.monotonic()

    success, payload, error = _run_with_timeout(
        run_agent,
        timeout_seconds,
    )

    elapsed = time.monotonic() - started

    if not success:
        print(
            f"[SendGuard][LLM] Investigation: "
            f"{provider.upper()} attempt {attempt} FAILED "
            f"after {elapsed:.2f}s: {error}"
        )
        return False, None, error

    result, signals = payload

    mode = _infer_investigation_mode(
        result,
        provider,
    )

    print(
        f"[SendGuard][LLM] Investigation: "
        f"{provider.upper()} attempt {attempt} succeeded "
        f"in {elapsed:.2f}s"
    )
    print(
        f"[SendGuard][LLM] Investigation SOURCE = {mode}"
    )

    return True, {
        "signals": signals,
        "mode": mode,
        "result": result,
    }, None


def _run_provider(
    provider: str,
    attempts: int,
    timeout_seconds: float,
    transaction_context,
    prompt: str,
    available_tools: list,
):
    """
    Runs one provider with retries.

    Example:

        Gemini #1 -> Gemini #2
    """
    failures = []

    for attempt in range(1, attempts + 1):
        try:
            success, payload, error = _run_provider_attempt(
                provider=provider,
                attempt=attempt,
                transaction_context=transaction_context,
                prompt=prompt,
                available_tools=available_tools,
                timeout_seconds=timeout_seconds,
            )
        except Exception as exc:
            success = False
            payload = None
            error = exc

            print(
                f"[SendGuard][LLM] Investigation: "
                f"{provider.upper()} attempt {attempt} raised: {exc}"
            )

        if success:
            return True, payload, failures

        failures.append(
            f"{provider.upper()} attempt {attempt}: {error}"
        )

        if attempt < attempts:
            print(
                f"[SendGuard][LLM] Investigation: "
                f"{provider.upper()} retrying..."
            )

            if RETRY_DELAY > 0:
                time.sleep(RETRY_DELAY)

    return False, None, failures


def _deterministic_investigate(
    transaction_context,
    tool_map,
    rejection_check_fn,
) -> dict:
    """UNCHANGED — existing deterministic investigation fallback."""
    reset_investigation_state(transaction_context)

    phone_number = transaction_context.get("phone_number")
    collected_signals = {}

    for name in [
        "check_sim_swap_tool",
        "check_device_swap_tool",
        "check_location_tool",
    ]:
        if rejection_check_fn(name, transaction_context) is not None:
            continue

        fn = tool_map.get(name)
        if fn is None:
            continue

        try:
            if name == "check_location_tool":
                result = fn(
                    phone_number=phone_number,
                    expected_latitude=transaction_context.get(
                        "usual_latitude"
                    ),
                    expected_longitude=transaction_context.get(
                        "usual_longitude"
                    ),
                )
            else:
                result = fn(
                    phone_number=phone_number
                )
        except Exception as exc:
            result = {
                "degraded": True,
                "error": str(exc),
            }

        collected_signals[name] = result

    return collected_signals


def investigate_transaction(
    transaction_context,
    available_tools,
    tool_map,
    rejection_check_fn,
) -> tuple[dict, str, Optional[str]]:
    """
    Returns:
        (collected_signals, mode, fallback_reason)

    Investigation order:

        Gemini #1
            ↓
        Gemini #2
            ↓
        Groq #1
            ↓
        Groq #2
            ↓
        deterministic fallback
    """
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

    all_failures = []

    print(
        "[SendGuard][LLM] Investigation: "
        "running Pydantic AI agent..."
    )

    # -----------------------------------------------------------------------
    # Gemini primary + retry
    # -----------------------------------------------------------------------
    gemini_ok, gemini_payload, gemini_failures = _run_provider(
        provider="gemini",
        attempts=GEMINI_MAX_ATTEMPTS,
        timeout_seconds=GEMINI_ATTEMPT_TIMEOUT,
        transaction_context=transaction_context,
        prompt=prompt,
        available_tools=available_tools,
    )

    all_failures.extend(gemini_failures)

    if gemini_ok and gemini_payload:
        return (
            gemini_payload["signals"],
            "AI_GEMINI",
            None,
        )

    print(
        "[SendGuard][LLM] Investigation: "
        "Gemini unavailable after retries. Trying Groq..."
    )

    # -----------------------------------------------------------------------
    # Groq fallback + retry
    # -----------------------------------------------------------------------
    groq_ok, groq_payload, groq_failures = _run_provider(
        provider="groq",
        attempts=GROQ_MAX_ATTEMPTS,
        timeout_seconds=GROQ_ATTEMPT_TIMEOUT,
        transaction_context=transaction_context,
        prompt=prompt,
        available_tools=available_tools,
    )

    all_failures.extend(groq_failures)

    if groq_ok and groq_payload:
        return (
            groq_payload["signals"],
            "AI_GROQ_FALLBACK",
            None,
        )

    # -----------------------------------------------------------------------
    # Deterministic final fallback
    # -----------------------------------------------------------------------
    print(
        "[SendGuard][LLM] Investigation: "
        "Gemini and Groq failed. Using deterministic fallback..."
    )

    signals = _deterministic_investigate(
        transaction_context,
        tool_map,
        rejection_check_fn,
    )

    print(
        "[SendGuard][LLM] Investigation SOURCE = "
        "DETERMINISTIC_FALLBACK"
    )

    fallback_reason = " | ".join(all_failures)

    return (
        signals,
        "DETERMINISTIC_FALLBACK",
        fallback_reason or "Both Gemini and Groq were unavailable",
    )


# ===========================================================================
# RECOMMENDATION — UNCHANGED
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