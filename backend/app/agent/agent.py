"""
SendGuard — The Agent (top-level orchestration, single entry point)

This is THE function the rest of the backend (the FastAPI endpoint) calls.
It ties the full Agent loop together:

    Observe  -> transaction context received
    Reason   -> Gemini decides which CAMARA signals to fetch (orchestrator.py)
    Act      -> those signals are fetched from real Nokia network APIs
    Reason   -> Trust Engine computes a deterministic Trust Index + tier
    Decide   -> Recommendation layer picks the specific action for this tier
    Act      -> the action is EXECUTED (actions.py) — not just reported
    Explain  -> full reasons + decision returned to the caller

This satisfies the hackathon's core requirement head-on: the AI Agent
intelligently orchestrates CAMARA APIs AND takes the decision AND the
action — it doesn't stop at a recommendation sitting on a screen, it drives
the transaction through to a concrete, executed outcome.
"""

from app.agent.orchestrator import decide_and_fetch_signals
from app.agent.trust_engine import compute_trust
from app.agent.recommendation import recommend_action
from app.agent.actions import execute_action


def run_agent(transaction_context: dict) -> dict:
    """
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
            "trusted_device_available": False,
        }

    Returns:
        A single dict with everything the frontend needs to render the
        live demo: the score, the tier, the specific action taken, the
        execution result, and the human-readable reasons.
    """
    # 1. Reason + Act: Gemini decides which network signals matter for this
    #    specific transaction, and fetches them from the real CAMARA APIs.
    collected_signals = decide_and_fetch_signals(transaction_context)

    # 2. Reason (deterministic): compute the Trust Index and risk tier.
    assessment = compute_trust(collected_signals, transaction_context)

    # 3. Decide: pick the specific action within that tier — Gemini chooses
    #    from the Python-defined allowed set, Python validates the choice.
    action = recommend_action(
        assessment.tier,
        transaction_context,
        assessment.degraded_signals,
        assessment.reasons,
    )

    # 4. Act: EXECUTE the action. The agent does not stop at a recommendation.
    execution_result = execute_action(action, transaction_context)

    # 5. Explain: return everything, ready for the frontend/judges to see.
    return {
        "trust_index": assessment.trust_index,
        "tier": assessment.tier,
        "action": action,
        "execution": execution_result,
        "reasons": assessment.reasons,
        "signals_checked": list(collected_signals.keys()),
        "signals_not_checked": assessment.uncalled_signals,
        "degraded_signals": assessment.degraded_signals,
        "raw_signals": collected_signals,  # full per-tool detail, for the frontend Signal Panel
    }
    