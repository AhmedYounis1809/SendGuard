"""SendGuard — The Agent (top-level orchestration, single entry point)."""

from app.agent.orchestrator import decide_and_fetch_signals
from app.agent.trust_engine import compute_trust
from app.agent.recommendation import recommend_action
from app.agent.actions import execute_action


def run_agent(transaction_context: dict) -> dict:
    collected_signals, investigation_mode, investigation_fallback_reason = decide_and_fetch_signals(transaction_context)

    assessment = compute_trust(collected_signals, transaction_context)

    action, recommendation_mode, recommendation_fallback_reason = recommend_action(
        assessment.tier, transaction_context, assessment.degraded_signals, assessment.reasons,
    )

    execution_result = execute_action(action, transaction_context)

    print(f"[SendGuard][Agent] investigation_mode={investigation_mode} recommendation_mode={recommendation_mode}")

    return {
        "trust_index": assessment.trust_index,
        "tier": assessment.tier,
        "action": action,
        "execution": execution_result,
        "reasons": assessment.reasons,
        "signals_checked": list(collected_signals.keys()),
        "signals_not_checked": assessment.uncalled_signals,
        "degraded_signals": assessment.degraded_signals,
        "raw_signals": collected_signals,
        "agent_mode": investigation_mode,
        "recommendation_mode": recommendation_mode,
        "fallback_reason": investigation_fallback_reason or recommendation_fallback_reason,
    }
