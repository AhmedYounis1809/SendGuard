"""
SendGuard — Per-investigation-run shared state (context variables).

Why this exists: the three tool functions in orchestrator.py must keep
their EXACT existing signatures (check_sim_swap_tool(phone_number: str),
etc.) so Pydantic AI can register them unchanged via `tool_plain`. That
means the tools have no direct parameter carrying transaction_context or
"which tools were already checked" — so we pass that state in via
contextvars instead, exactly like demo_mode.py already does for signal
injection. This file is intentionally separate from demo_mode.py (which
must not be modified) and from llm_client.py (to avoid a circular import
with orchestrator.py).

Set by llm_client.investigate_transaction() once per request, read/written
by the tool functions in orchestrator.py during that request.
"""

import contextvars
from typing import Optional

transaction_context_var: contextvars.ContextVar[Optional[dict]] = contextvars.ContextVar(
    "sendguard_transaction_context", default=None
)
checked_tools_var: contextvars.ContextVar[Optional[set]] = contextvars.ContextVar(
    "sendguard_checked_tools", default=None
)
collected_signals_var: contextvars.ContextVar[Optional[dict]] = contextvars.ContextVar(
    "sendguard_collected_signals", default=None
)


def reset_investigation_state(transaction_context: dict) -> None:
    """Called at the start of every investigation attempt (including the
    deterministic fallback pass) so no state leaks between attempts."""
    transaction_context_var.set(transaction_context)
    checked_tools_var.set(set())
    collected_signals_var.set({})