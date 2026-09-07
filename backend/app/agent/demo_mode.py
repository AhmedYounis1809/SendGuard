"""
SendGuard — Demo Mode signal injection.

Lets a request temporarily force the CAMARA tools to return pre-set mock
evidence instead of calling real Nokia APIs — WITHOUT the Agent (Gemini/
Groq) knowing anything changed. The agent still genuinely decides which
tools to call; only the tool's EXECUTION is swapped out.

Uses contextvars (not a plain global) so this is safe under concurrent
requests — each request gets its own isolated value.
"""

import contextvars
from typing import Optional

_demo_signals_var: contextvars.ContextVar[Optional[dict]] = contextvars.ContextVar(
    "demo_signals", default=None
)

_NOT_DEMO_MODE = object()  # sentinel: "no demo active, call the real API"


def set_demo_signals(signals: Optional[dict]) -> None:
    _demo_signals_var.set(signals)


def get_demo_signal(tool_name: str):
    """
    Returns:
        - the sentinel _NOT_DEMO_MODE if no demo scenario is active (caller
          should proceed to call the real CAMARA API)
        - the mock evidence dict for this tool if a demo IS active and this
          scenario defines a signal for it
        - a degraded placeholder if a demo IS active but this scenario
          simply doesn't define this signal (guarantees we NEVER silently
          fall through to a real API call once in demo mode)
    """
    signals = _demo_signals_var.get()
    if signals is None:
        return _NOT_DEMO_MODE
    return signals.get(tool_name, {"degraded": True, "error": "no mock signal defined for this demo scenario"})


NOT_DEMO_MODE = _NOT_DEMO_MODE