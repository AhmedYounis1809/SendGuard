"""
SendGuard — FastAPI entrypoint.

Exposes:
  - GET  /health                — basic liveness check
  - POST /api/camara/verify     — raw CAMARA connectivity check (existing,
                                   used by the frontend's "Test APIs" screen)
  - POST /api/agent/run         — TEMPORARY, DB-FREE endpoint that runs the
                                   full Agent pipeline and returns the raw
                                   result. No persistence yet — this is
                                   deliberate: the team is verifying the
                                   Agent end-to-end before wiring up database
                                   storage (see BACKLOG.md Phase D). Once the
                                   DB pieces are ready, this gets replaced by
                                   the persisted /api/transaction endpoint
                                   (already written in
                                   app/api/routes_transaction.py, just not
                                   wired in here yet).
"""

from dotenv import load_dotenv

load_dotenv()

from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.camara.sim_swap import get_sim_swap_score
from app.camara.device_swap import get_device_swap_score
from app.camara.location_verification import verify_location
from app.agent.agent import run_agent

SIMULATOR_NUMBER = "+99999991000"
CAIRO_LAT, CAIRO_LNG = 30.0444, 31.2357

app = FastAPI(title="SendGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CamaraVerifyRequest(BaseModel):
    phone_number: str = SIMULATOR_NUMBER


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/camara/verify")
def verify_camara_setup(request: CamaraVerifyRequest = CamaraVerifyRequest()):
    phone_number = request.phone_number
    steps = []

    sim_result = get_sim_swap_score(phone_number)
    steps.append({
        "step": 1,
        "id": "sim_swap",
        "name": "SIM Swap",
        "passed": not sim_result.degraded,
        "detail": (
            f"hours_since_swap={sim_result.hours_since_swap}, weight={sim_result.weight}"
            if not sim_result.degraded
            else str(sim_result.raw_response)
        ),
    })

    device_result = get_device_swap_score(phone_number)
    steps.append({
        "step": 2,
        "id": "device_swap",
        "name": "Device Swap",
        "passed": not device_result.degraded,
        "detail": (
            f"hours_since_swap={device_result.hours_since_swap}, weight={device_result.weight}"
            if not device_result.degraded
            else str(device_result.raw_response)
        ),
    })

    location_result = verify_location(
        phone_number, latitude=CAIRO_LAT, longitude=CAIRO_LNG, radius_meters=50000
    )
    steps.append({
        "step": 3,
        "id": "location_verification",
        "name": "Location Verification",
        "passed": not location_result.degraded,
        "detail": (
            f"verificationResult={location_result.verification_result}"
            if not location_result.degraded
            else str(location_result.raw_response)
        ),
    })

    return {"steps": steps, "all_passed": all(s["passed"] for s in steps)}


class AgentTestRequest(BaseModel):
    phone_number: str = SIMULATOR_NUMBER
    amount: float = 50000
    currency: str = "EGP"
    is_new_beneficiary: bool = True
    recent_transaction_count_10min: int = 1
    usual_latitude: Optional[float] = CAIRO_LAT
    usual_longitude: Optional[float] = CAIRO_LNG
    has_location_history: bool = True
    trusted_device_available: bool = False


@app.post("/api/agent/run")
def run_agent_test(request: AgentTestRequest = AgentTestRequest()):
    """
    TEMPORARY, DB-FREE. Proves the full Agent pipeline (Gemini orchestrator
    -> real CAMARA APIs -> deterministic Trust Engine -> Recommendation ->
    Executed Action) works end-to-end and is reachable over HTTP. No
    database involved — nothing is persisted yet, by design.
    """
    return run_agent(request.dict())
    