"""
SendGuard — Mock CAMARA signals for the 6 predefined demo scenarios.

Only the network SIGNALS are mocked here (to guarantee zero real Nokia
calls and 100% reproducibility during judging). The transaction context
(amount, beneficiary, velocity, etc.) comes from the frontend request body
— the frontend's demo-scenarios.ts is the source of truth for that, so we
don't duplicate it here. Scenario IDs match the frontend's DEMO_SCENARIOS
exactly.

The final Trust Index / Tier / Action is NEVER hardcoded — every scenario
still runs through the real Gemini/Groq-orchestrated investigation (agent
decides which of these mocked tools to call), the real deterministic
Trust Engine, and the real Gemini/Groq/Deterministic recommendation chain.
"""

DEMO_SCENARIO_SIGNALS = {
    "everyday_transfer": {
        "check_sim_swap_tool": {"swapped_recently": False, "hours_since_swap": None, "degraded": False},
        "check_device_swap_tool": {"swapped_recently": False, "hours_since_swap": None, "degraded": False},
        "check_location_tool": {"verified": True, "verification_result": "TRUE", "degraded": False},
    },
    "family_support": {
        "check_sim_swap_tool": {"swapped_recently": False, "hours_since_swap": None, "degraded": False},
        "check_device_swap_tool": {"swapped_recently": False, "hours_since_swap": None, "degraded": False},
        "check_location_tool": {"verified": True, "verification_result": "TRUE", "degraded": False},
    },
    "new_device": {
        "check_sim_swap_tool": {"swapped_recently": False, "hours_since_swap": None, "degraded": False},
        "check_device_swap_tool": {"swapped_recently": True, "hours_since_swap": 2, "degraded": False},
        "check_location_tool": {"verified": True, "verification_result": "TRUE", "degraded": False},
    },
    "new_beneficiary_large": {
        "check_sim_swap_tool": {"swapped_recently": True, "hours_since_swap": 8, "degraded": False},
        "check_device_swap_tool": {"swapped_recently": True, "hours_since_swap": 3, "degraded": False},
        "check_location_tool": {"verified": True, "verification_result": "TRUE", "degraded": False},
    },
    "rapid_transfers": {
        "check_sim_swap_tool": {"swapped_recently": False, "hours_since_swap": None, "degraded": False},
        "check_device_swap_tool": {"swapped_recently": True, "hours_since_swap": 5, "degraded": False},
        # no location entry — location_reference_available=false in this scenario's
        # payload, so the policy guardrail rejects the check before it would ever run
    },
    "high_value_no_reference": {
        "check_sim_swap_tool": {"swapped_recently": True, "hours_since_swap": 1, "degraded": False},
        "check_device_swap_tool": {"swapped_recently": True, "hours_since_swap": 1.5, "degraded": False},
        # no location entry — same reason as above
    },
}