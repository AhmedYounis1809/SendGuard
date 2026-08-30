"""
SendGuard — FastAPI entrypoint.

Currently exposes only the CAMARA verification check used by the frontend's
"Test APIs" screen (mirrors scripts/verify_camara_setup.py, but returns JSON
instead of printing). The Trust Engine / transaction endpoints land in a
later phase (see BACKLOG.md Phase D).
"""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.camara.sim_swap import get_sim_swap_score
from app.camara.device_swap import get_device_swap_score
from app.camara.location_verification import verify_location

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
