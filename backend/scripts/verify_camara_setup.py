"""
SendGuard — Manual verification script.

Run this ONE file to confirm all 3 confirmed CAMARA integrations (SIM Swap,
Device Swap, Location Verification) are wired correctly against your real
Nokia App Key before committing/pushing.

Usage (from the backend/ folder):
    python -m scripts.verify_camara_setup

Requires backend/.env to have a valid NAC_API_KEY.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Allow running this script directly from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.camara.sim_swap import get_sim_swap_score
from app.camara.device_swap import get_device_swap_score
from app.camara.location_verification import verify_location

SIMULATOR_NUMBER = "+99999991000"

print("=" * 60)
print("SendGuard — Transaction Risk Assessment")
print("=" * 60)

print("\n[1/3] Testing SIM Swap...")
sim_result = get_sim_swap_score(SIMULATOR_NUMBER)
if sim_result.degraded:
    print(f"  ❌ FAILED: {sim_result.raw_response}")
else:
    print(f"  ✅ PASSED — hours_since_swap={sim_result.hours_since_swap}, weight={sim_result.weight}")

print("\n[2/3] Testing Device Swap...")
device_result = get_device_swap_score(SIMULATOR_NUMBER)
if device_result.degraded:
    print(f"  ❌ FAILED: {device_result.raw_response}")
else:
    print(f"  ✅ PASSED — hours_since_swap={device_result.hours_since_swap}, weight={device_result.weight}")

print("\n[3/3] Testing Location Verification...")
# Example: check against Cairo coordinates, 50km radius
location_result = verify_location(SIMULATOR_NUMBER, latitude=30.0444, longitude=31.2357, radius_meters=50000)
if location_result.degraded:
    print(f"  ❌ FAILED: {location_result.raw_response}")
else:
    print(f"  ✅ PASSED — verificationResult={location_result.verification_result}")

print("\n" + "=" * 60)
print("If all 3 show ✅ PASSED, your setup is confirmed working end-to-end.")
print("=" * 60)
