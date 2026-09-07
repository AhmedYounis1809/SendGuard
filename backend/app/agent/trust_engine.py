"""
SendGuard — Trust Engine (100% Deterministic — NO LLM CALLS HERE, EVER)

This is the mathematical core of SendGuard. It takes:
  1. The signals the orchestrator agent decided to fetch (SIM Swap, Device
     Swap, Location Verification — only the ones it chose to call)
  2. Bank-side transaction context (amount, new beneficiary, recent
     transaction velocity — data the bank already has, no API call needed)

...and computes a numeric Trust Index (0-100), then maps it to one of 4
fixed tiers via simple threshold comparison.

Same input -> same output, ALWAYS. This file must never call an LLM. This
is a deliberate, locked architecture decision (see BACKLOG.md Phase C):
financial risk math must be reproducible and defensible in front of judges,
not subject to LLM non-determinism.
"""

from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# INITIAL HEURISTIC WEIGHTS
# NOT scientifically derived. NOT a trained model. These are starting
# points based on risk-analysis logic for the MVP/prototype stage.
# Future Work (production): Dynamic Weight Adjustment — the weights below
# would be tuned automatically based on real fraud outcome data over time.
# ---------------------------------------------------------------------------

BASE_TRUST = 90  # optimistic starting point — "innocent until signals say otherwise"
# NOTE: raised from an initial 80 after live testing revealed a calibration
# issue: a plausible INNOCENT profile (recent SIM change due to a real
# reason + traveling, landing on a new local contact) produced the exact
# same signal pattern as a genuine fraud pattern, and both landed directly
# in TEMPORARY_FREEZE — skipping any chance at Adaptive Verification/Hold
# recovery. This contradicts our core design principle: freeze is the LAST
# resort, not the first. Raising the base to 90 means a single very-recent
# signal (e.g. SIM swap alone) no longer alone crosses into FREEZE
# territory — reaching FREEZE now requires multiple strong, compounding
# negative signals (e.g. BOTH a very recent SIM swap AND a very recent
# device swap together — the classic account-takeover signature).

WEIGHTS = {
    "location_verified_true": +3,
    "location_verified_false": -20,
    "no_location_reference": -5,  # cold-start/no-history case — reduced confidence, NOT a red flag
    "new_beneficiary": -10,
    "frequent_beneficiary": +5,
    "transaction_burst": -20,
    "large_amount": -8,
}

LARGE_AMOUNT_THRESHOLD_EGP = 25000
BURST_TRANSACTION_COUNT_THRESHOLD = 3  # 3+ transactions within the tracked window = burst

# ---------------------------------------------------------------------------
# Time-decay weight tiers for SIM Swap / Device Swap.
#
# NOTE ON DUPLICATION: app/camara/sim_swap.py and device_swap.py ALSO
# compute an internal "weight" as a convenience for their own standalone
# use (e.g. verify_full_agent.py's early tests). That value is intentionally
# NEVER shown to Gemini (see orchestrator.py's tool wrappers, which strip
# it) and is NOT what the Trust Engine uses. The Trust Engine recomputes
# weight from raw `hours_since_swap` evidence independently, right here, so
# that ALL risk arithmetic provably lives in exactly one deterministic
# place. If these thresholds ever change, update both here and in the
# camara/*.py files' own internal scoring for consistency, or (better,
# future refactor) remove the internal scoring from camara/*.py entirely
# and make this function their single source of truth.
# ---------------------------------------------------------------------------

def _sim_swap_weight(hours_since_swap: Optional[float]) -> int:
    if hours_since_swap is None:
        return 0
    if hours_since_swap < 24:
        return -25
    elif hours_since_swap < 24 * 7:
        return -10
    elif hours_since_swap < 24 * 30:
        return -2
    return 0


def _device_swap_weight(hours_since_swap: Optional[float]) -> int:
    if hours_since_swap is None:
        return 0
    if hours_since_swap < 24:
        return -25
    elif hours_since_swap < 24 * 7:
        return -8
    elif hours_since_swap < 24 * 30:
        return -2
    return 0


# A degraded (failed) signal must never silently help the score. If any
# CALLED signal failed, we cap the maximum achievable trust so the system
# can never reach a confident ALLOW on incomplete evidence.
DEGRADED_SCORE_CAP = 75

ALL_TOOL_NAMES = ["check_sim_swap_tool", "check_device_swap_tool", "check_location_tool"]


@dataclass
class TrustAssessment:
    trust_index: int                # 0-100, clamped
    tier: str                       # ALLOW / ADAPTIVE_VERIFICATION / TRANSACTION_HOLD / TEMPORARY_FREEZE
    contributions: dict = field(default_factory=dict)   # signal_name -> weight applied
    degraded_signals: list = field(default_factory=list)
    uncalled_signals: list = field(default_factory=list)
    reasons: list = field(default_factory=list)         # human-readable, deterministic — no LLM needed


def tier_for_score(score: int) -> str:
    """The ONLY place the tier thresholds are defined. Deterministic."""
    if score >= 80:
        return "ALLOW"
    elif score >= 50:
        return "ADAPTIVE_VERIFICATION"
    elif score >= 25:
        return "TRANSACTION_HOLD"
    else:
        return "TEMPORARY_FREEZE"


def compute_trust(collected_signals: dict, transaction_context: dict) -> TrustAssessment:
    """
    Args:
        collected_signals: output of orchestrator.decide_and_fetch_signals(),
            e.g. {"check_sim_swap_tool": {...}, "check_device_swap_tool": {...}}
            — only contains keys for tools the agent actually chose to call.
        transaction_context: same dict passed to the orchestrator, e.g.
            {"amount": 50000, "is_new_beneficiary": True,
             "recent_transaction_count_10min": 1, ...}

    Returns:
        TrustAssessment with the final score, tier, and explainability data.
    """
    score = BASE_TRUST
    contributions = {}
    degraded_signals = []
    reasons = []

    uncalled_signals = [name for name in ALL_TOOL_NAMES if name not in collected_signals]

    # --- SIM Swap (evidence only in — weight computed HERE, not upstream) ---
    sim = collected_signals.get("check_sim_swap_tool")
    if sim:
        if sim.get("degraded"):
            degraded_signals.append("sim_swap")
            reasons.append("SIM Swap check failed — treated as unknown, not safe")
        else:
            hrs = sim.get("hours_since_swap")
            w = _sim_swap_weight(hrs)
            score += w
            contributions["sim_swap"] = w
            if w < 0:
                reasons.append(f"Recent SIM change {hrs}h ago ({w:+d})")
            else:
                reasons.append(f"No recent SIM change ({w:+d})")

    # --- Device Swap (evidence only in — weight computed HERE, not upstream) ---
    device = collected_signals.get("check_device_swap_tool")
    if device:
        if device.get("degraded"):
            degraded_signals.append("device_swap")
            reasons.append("Device Swap check failed — treated as unknown, not safe")
        else:
            hrs = device.get("hours_since_swap")
            w = _device_swap_weight(hrs)
            score += w
            contributions["device_swap"] = w
            if w < 0:
                reasons.append(f"New device detected {hrs}h ago ({w:+d})")
            else:
                reasons.append(f"Known device ({w:+d})")

    # --- Location Verification ---
    location = collected_signals.get("check_location_tool")
    if location:
        if location.get("degraded"):
            degraded_signals.append("location_verification")
            reasons.append("Location check failed — treated as unknown, not safe")
        else:
            if location.get("verified"):
                w = WEIGHTS["location_verified_true"]
                reasons.append(f"Location within expected area ({w:+d})")
            else:
                w = WEIGHTS["location_verified_false"]
                reasons.append(f"Location outside expected area ({w:+d})")
            score += w
            contributions["location_verification"] = w

    # --- Bank-side signals (always available — no API call, no tool needed) ---
    if transaction_context.get("is_new_beneficiary"):
        w = WEIGHTS["new_beneficiary"]
        reasons.append(f"First transaction to this beneficiary ({w:+d})")
    else:
        w = WEIGHTS["frequent_beneficiary"]
        reasons.append(f"Familiar beneficiary ({w:+d})")
    score += w
    contributions["beneficiary_history"] = w

    # No location reference on file is NOT treated as a red flag — it's
    # simply reduced confidence (less evidence available), consistent with
    # our Cold Start philosophy. Only applies when the location tool wasn't
    # even attempted for this exact reason (not e.g. a degraded call).
    if not transaction_context.get("location_reference_available", False):
        w = WEIGHTS["no_location_reference"]
        score += w
        contributions["location_reference"] = w
        reasons.append(f"No location reference available ({w:+d})")

    burst_count = transaction_context.get("recent_transaction_count_10min", 0)
    if burst_count >= BURST_TRANSACTION_COUNT_THRESHOLD:
        w = WEIGHTS["transaction_burst"]
        score += w
        contributions["transaction_burst"] = w
        reasons.append(f"{burst_count} transactions in the last 10 minutes ({w:+d})")

    amount = transaction_context.get("amount", 0)
    if amount >= LARGE_AMOUNT_THRESHOLD_EGP:
        w = WEIGHTS["large_amount"]
        score += w
        contributions["large_amount"] = w
        reasons.append(f"Large transaction amount ({w:+d})")

    # --- Degraded Mode ---
    # A failed signal must never be silently treated as "safe." If anything
    # the agent tried to check came back degraded, cap the ceiling so the
    # system cannot reach a confident ALLOW on incomplete evidence.
    if degraded_signals:
        score = min(score, DEGRADED_SCORE_CAP)

    score = max(0, min(100, score))
    tier = tier_for_score(score)

    return TrustAssessment(
        trust_index=score,
        tier=tier,
        contributions=contributions,
        degraded_signals=degraded_signals,
        uncalled_signals=uncalled_signals,
        reasons=reasons,
    )


# ---------------------------------------------------------------------------
# CONFIDENCE RECOVERY
# ---------------------------------------------------------------------------

VERIFICATION_SUCCESS_BOOST = 40


def apply_verification_recovery(
    previous_assessment: TrustAssessment, verification_method: str
) -> TrustAssessment:
    """
    Called after a user successfully completes a Step-Up/Adaptive
    Verification challenge for a specific transaction. We do NOT re-run the
    CAMARA signal checks (the network facts haven't changed) — we
    incorporate the new evidence that the user proved their identity/intent
    for this specific transaction, boost the Trust Index, and re-evaluate
    the tier. This is what lets a flagged-but-legitimate user recover
    instead of being permanently blocked.
    """
    new_score = max(0, min(100, previous_assessment.trust_index + VERIFICATION_SUCCESS_BOOST))
    new_tier = tier_for_score(new_score)
    new_reasons = previous_assessment.reasons + [
        f"Additional verification succeeded via {verification_method} "
        f"(+{VERIFICATION_SUCCESS_BOOST})"
    ]

    return TrustAssessment(
        trust_index=new_score,
        tier=new_tier,
        contributions={
            **previous_assessment.contributions,
            "verification_recovery": VERIFICATION_SUCCESS_BOOST,
        },
        degraded_signals=previous_assessment.degraded_signals,
        uncalled_signals=previous_assessment.uncalled_signals,
        reasons=new_reasons,
    )