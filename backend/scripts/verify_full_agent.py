"""
SendGuard — Full Agent Pipeline Verification.

Runs the COMPLETE loop end-to-end: Gemini decides signals -> real CAMARA
APIs -> deterministic Trust Engine -> Recommendation -> Executed Action.

Usage (from backend/):
    python -m scripts.verify_full_agent
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agent.agent import run_agent

print("=" * 60)
print("SendGuard — FULL AGENT PIPELINE Verification")
print("=" * 60)

# Same test transaction as before: large amount, new beneficiary,
# no trusted device on file.
transaction_context = {
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

print(f"\nTransaction: {transaction_context}\n")
print("Running the full agent loop...\n")

result = run_agent(transaction_context)

print("\n" + "-" * 60)
print(f"Trust Index:          {result['trust_index']}/100")
print(f"Tier:                 {result['tier']}")
print(f"Recommended Action:   {result['action']}")
print(f"Execution Result:     {result['execution']}")
print(f"Signals checked:      {result['signals_checked']}")
print(f"Signals NOT checked:  {result['signals_not_checked']}")
print(f"Degraded signals:     {result['degraded_signals']}")
print("\nReasons:")
for r in result["reasons"]:
    print(f"  • {r}")
print("-" * 60)