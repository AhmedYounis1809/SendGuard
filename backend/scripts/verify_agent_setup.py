"""
SendGuard — Manual verification for the AI Orchestrator.

Run this to confirm Gemini is correctly deciding which CAMARA tools to call,
BEFORE wiring it into the full trust_engine.py pipeline.

Usage (from backend/):
    python -m scripts.verify_agent_setup
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agent.orchestrator import decide_and_fetch_signals

print("=" * 60)
print("SendGuard — AI Orchestrator Verification")
print("=" * 60)

# Scenario: a large transaction to a NEW beneficiary — should trigger
# the agent to check most/all signals.
transaction_context = {
    "phone_number": "+99999991000",
    "amount": 50000,
    "currency": "EGP",
    "is_new_beneficiary": True,
    "recent_transaction_count_10min": 1,
    "usual_latitude": 30.0444,
    "usual_longitude": 31.2357,
    "has_location_history": True,
}

print(f"\nTransaction context:\n{transaction_context}\n")
print("Calling Gemini to decide which signals to check...\n")

signals = decide_and_fetch_signals(transaction_context)

if not signals:
    print("⚠️  The agent chose not to call any tools for this transaction.")
else:
    print(f"✅ Agent called {len(signals)} tool(s):\n")
    for tool_name, result in signals.items():
        print(f"  • {tool_name}: {result}")

print("\n" + "=" * 60)
