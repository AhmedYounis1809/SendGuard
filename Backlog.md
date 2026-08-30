# SendGuard — Project Backlog & Execution Plan
### GSMA MENA Ignite Hackathon — Finals / Prototype Phase

**Theme:** Secure Fintech, Payments & Anti-Fraud Innovation
**Tech Stack:** Python (FastAPI) backend + AI Agent · React (JS) frontend
**Mentor:** Sulaiman S. Alharbi (STC) — session must happen before **10 Sep 2026**

---

## 0. One-Line Pitch (keep this pinned at the top of the repo README too)

> SendGuard is an AI-powered trust orchestration layer that sits between financial apps (wallets, banks) and telecom network intelligence (CAMARA APIs), turning fraud detection from a binary block/allow decision into a graduated, explainable trust assessment.

---

## 1. CONFIRMED — Nokia Network-as-Code Access & API Selection

**Resolved via official docs AND verified live in the team's own dashboard.**

- [x] Every team member self-registers individually at **networkascode.nokia.io** (no organization setup needed)
- [x] App Key obtained — team is in **Simulator Mode** by default (live network access requires a billing account — not needed for the hackathon; simulator numbers are the intended testing path)
- [x] Client pattern confirmed: `NetworkAsCodeApi(rapidapi_host="network-as-code.nokia.rapidapi.com", api_key=...)` — matches the `x-rapidapi-host` / `x-rapidapi-key` headers seen directly in the dashboard's "Test Endpoint" playground
- [x] **CORRECTION:** "Device Status" DOES exist as its own API (v0.5.1), separate from Device Swap, Device Reachability Status, and Device Roaming Status. For our fraud use case, **Device Swap remains the right pick** (purpose-built for "did the SIM move to a new physical device" — exactly our signal), but all four exist if needed later.
- [x] Number Verification confirmed to expose two operations: `phoneNumberVerify` (POST — the one we need) and `phoneNumberShare` (GET — retrieves the number itself, not needed for our use case)
- [x] **Connectivity CONFIRMED working** — team tested `phoneNumberVerify` (Number Verification v2) via PowerShell `Invoke-WebRequest` with the real API key. Got a `404 IDENTIFIER_NOT_FOUND` response — confirmed auth + request format correct; real phone numbers aren't recognized in Simulator Mode.
- [x] **SIM Swap (v1.0.0) FULLY CONFIRMED AND CODED** — live-tested with simulator number `+99999991000`:
  - `POST sim-swap/sim-swap/v0/check` body `{phoneNumber, maxAge}` → `{"swapped": true}`
  - `POST sim-swap/sim-swap/v0/retrieve-date` body `{phoneNumber}` → `{"latestSimChange": "2026-08-30T01:21:43.112028Z"}`
- [x] **Device Swap (v1.0.0) FULLY CONFIRMED AND CODED** — live-tested:
  - `POST device-swap/device-swap/v1/check` (note: **v1**, not v0 like SIM Swap!) → `{"swapped": true}`
  - `POST device-swap/device-swap/v1/retrieve-date` → `{"latestDeviceChange": "..."}` (different field name than SIM Swap's `latestSimChange`)
- [x] **Location Verification (v0.2.0) FULLY CONFIRMED AND CODED** — live-tested:
  - Different base URL entirely: `https://network-as-code.p-eu.apihub.nokia.io/location-verification/v0/verify` (NOT under `/passthrough/camara/v1/...` like the other two — see `client.py`'s `LOCATION_VERIFICATION_BASE`)
  - body: `{"device": {"phoneNumber": ...}, "area": {"areaType": "CIRCLE", "center": {lat,lng}, "radius": meters}}`
  - response: `{"verificationResult": "TRUE"/"FALSE" (STRING, not real boolean!), "lastLocationTime": "..."}`
- [x] **Decision: switched from `network_as_code` SDK to plain `requests`** — since we've verified the real endpoints ourselves, this removes all SDK guesswork
- [x] Added `backend/scripts/verify_camara_setup.py` — one command (`python -m scripts.verify_camara_setup`) runs all 3 confirmed integrations and prints PASS/FAIL. Run this before every commit that touches CAMARA code.
- [ ] Number Verification: got a `401 "Authorization header is missing"` on `phoneNumberVerify` — likely needs a proper `Authorization: Bearer <key>` header (not just `x-rapidapi-key`). **Treat as stretch goal** — don't block MVP progress on this; SIM Swap + Device Swap + Location Verification alone are enough for a strong demo
- [ ] Quality-on-Demand (QoD) not yet tested — repeat the same playground-first process, then code it following this exact pattern
- [ ] 🔒 Security: the App Key is a secret. Never paste it in chat messages, commit messages, screenshots for the demo video, or push it to GitHub (must stay in `.env` only, which is gitignored)

### Exit criteria: ✅ FULLY MET
Three real CAMARA APIs (SIM Swap, Device Swap, Location Verification) are confirmed working end-to-end with live JSON responses against a real App Key. This alone is enough to build a complete, credible MVP even without Number Verification or QoD.
| Category | APIs Available |
|---|---|
| Digital Identity & Anti-Fraud | Number Verification (v1.0.0 + v2.1), SIM Swap, SIM Swap Subscriptions, **Device Swap**, Location Verification (v1.0.0 + v0.2.0), KYC Age Verification, KYC Match, KYC Tenure, KYC Fill In, Number Recycling, Call Forwarding Signal, Consent Info |
| Network Intelligence | Congestion Insights |
| Device Intelligence | Location Retrieval, Geofencing Subscriptions, Device Reachability Status (Retrieve + Subscriptions), Device Roaming Status (Retrieve + Subscriptions), **Device Status** (confirmed separate API, v0.5.1) |
| Programmable Connectivity | Quality on Demand (v0.10.1 + v1.0.0), Network Slicing, Slice Device Attach |

**Our core 5 (unchanged from design):** Number Verification, SIM Swap, Device Swap, Location Verification, QoD — all confirmed available and directly testable in the dashboard playground right now, no waiting needed.

---

## 2. IMMEDIATE — Mentor Session (still valuable, now lower priority)

The API-availability and naming questions are resolved directly from the live dashboard. The mentor session is still worth keeping (STC perspective on production deployment, judge-style critique, MVP scoping) but is **no longer a blocker** for starting development.

### Mentor questions to bring (priority order)
1. Which CAMARA APIs are actually available on the Nokia Network-as-Code sandbox for us?
2. Does Number Verification confirm what we think it does (number ↔ authenticated device match)?
3. How exactly does SIM Swap surface recency (timestamp vs boolean)?
4. Device Status vs Device Swap — which is the right API for our fraud use case?
5. Is Location Verification appropriate here, and what are the consent constraints?
6. Does our AI Agent design count as genuine "agentic orchestration" for judging criteria?
7. With limited time, which 2–3 APIs should we build deep integration with instead of spreading thin across 5?
8. (If time remains) Biggest weakness a judge would find in SendGuard — ask this last, and let the mentor be blunt.

---

## 2. Tech Stack (confirmed)

| Layer | Choice | Notes |
|---|---|---|
| Backend | Python + **FastAPI** | Async support matters — we'll call multiple CAMARA APIs, ideally in parallel |
| AI Agent | Python (LLM-based reasoning layer, e.g., Anthropic/OpenAI API, or a structured reasoning module if the Resource & Tooling Guide mandates a specific tool) | **Confirm with mentor / Resource & Tooling Guide before locking this in** |
| Frontend | React (JS) | Single dashboard app — no need for a separate mobile app |
| Database | SQLite (prototype) → Postgres if time allows | Stores transaction logs, user behavioral profiles, decision history. **No migration tool (Alembic) on purpose** — schema changes fast early on; use `Base.metadata.drop_all()` + `create_all()` to reset during development (see `db/database.py`). Add Alembic later only if you need to preserve seeded demo data across schema changes. |
| CAMARA integration | **`requests`** (plain HTTP calls to confirmed REST endpoints) | ~~`network_as_code` PyPI package~~ — dropped in favor of direct `requests` calls once the team confirmed the real REST endpoints live (see `docs/architecture.md`). No SDK guesswork left for SIM Swap. |
| Hosting (Demo) | **Render** (backend) + **Vercel/Netlify** (frontend) | See Section 2.1 — free tiers have caveats |
| API mocking | Local mock server for any CAMARA API not available/stable in sandbox | Critical fallback — see Section 6 |

### 2.1 Free Deployment Notes (Read Before Demo Day)

- **Backend (Render free tier):** the service sleeps after ~15 min of inactivity. First request after sleeping takes 30–60s to wake up (cold start). **Before any live demo, open the deployed URL yourself a few minutes early to wake it up**, or set up a free [UptimeRobot](https://uptimerobot.com) ping every 10 minutes during the demo window.
- **Railway** no longer has a permanent free tier (trial credit only) — don't rely on it as primary hosting.
- **Frontend (Vercel/Netlify free tier):** no cold-start issue, safe to rely on.
- **Database (SQLite on Render free tier):** the filesystem is ephemeral — a server restart can wipe the SQLite file. This is acceptable for prototype demos since scenarios are seeded/hardcoded, not accumulated real data. If persistence matters more, migrate to a free hosted Postgres (**Neon** or **Supabase** both offer a genuinely free, non-trial tier) — the SQLAlchemy code should need minimal changes to switch.

⚠️ **Do not lock in the AI Agent implementation detail until the mentor confirms the Resource & Tooling Guide requirements.** The hackathon rules state the AI Agent must use approved tooling — verify before building.

---

## 3. Repository Structure

```
sendguard/
├── README.md                     # Project overview, setup, how to run (for judges)
├── BACKLOG.md                    # This file
├── docs/
│   ├── mentor_questions.md
│   ├── mentor_session_notes.md   # Fill in immediately after the call
│   ├── architecture.md
│   ├── decisions_log.md          # Every major decision + why (Decision 1-5 from mentor prep)
│   └── demo_scenarios.md         # The 4 fraud scenarios, fully scripted
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint
│   │   ├── api/
│   │   │   ├── routes_transaction.py
│   │   │   └── routes_health.py
│   │   ├── camara/
│   │   │   ├── number_verification.py
│   │   │   ├── sim_swap.py
│   │   │   ├── device_swap.py      # CONFIRMED name via official NaC docs (not "device_status")
│   │   │   ├── location_verification.py
│   │   │   ├── qod.py
│   │   │   └── mock/              # Fallback only if a specific call misbehaves during dev
│   │   ├── agent/
│   │   │   ├── orchestrator.py    # Core AI Agent: observe → reason → act → explain
│   │   │   ├── trust_engine.py    # Signal aggregation + Trust Index calculation
│   │   │   ├── recommendation.py  # Maps Trust Index → Allow/Verify/Hold/Freeze
│   │   │   └── explainability.py  # Generates human-readable reasoning
│   │   ├── models/
│   │   │   ├── transaction.py
│   │   │   └── user_profile.py    # Behavioral profile for Cold Start handling
│   │   └── db/
│   │       └── database.py
│   ├── tests/
│   │   └── test_scenarios.py      # Automated tests for the 4 fraud scenarios
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── TransactionSimulator.jsx   # Lets you "trigger" a transaction live
│   │   │   ├── SignalPanel.jsx            # Shows each CAMARA API result live
│   │   │   ├── TrustIndexGauge.jsx        # Visual 0-100 gauge
│   │   │   ├── DecisionCard.jsx           # Allow/Verify/Hold/Freeze + reasons
│   │   │   └── ScenarioSelector.jsx       # Quick-switch between demo scenarios
│   │   └── api/
│   │       └── client.js          # Calls backend
│   ├── package.json
│   └── .env.example
└── .gitignore
```

- [ ] Create this structure in the repo (empty files are fine for now — commit skeleton first)

---

## 4. Phase-by-Phase Backlog

### Phase A — Freeze the Concept ✅ DONE
Idea, positioning, Trust Index concept, 4-tier decision model, Confidence Recovery — all finalized in Phase 1 documents.

---

### Phase B — API Reality Check ✅ DONE (for MVP-critical APIs)
- [x] Confirmed API list via official Nokia docs and live dashboard testing
- [x] `client.py` — shared REST client using `requests`, supports two different confirmed base URLs
- [x] `sim_swap.py` — ✅ fully confirmed live, both `check` and `retrieve-date` operations
- [x] `device_swap.py` — ✅ fully confirmed live, both operations (note the v1 path + `latestDeviceChange` field quirks)
- [x] `location_verification.py` — ✅ fully confirmed live (different base URL, string-enum response)
- [x] `scripts/verify_camara_setup.py` — one-command end-to-end verification for all 3
- [ ] `number_verification.py` — ⚠️ stretch goal only, blocked on a 401 auth issue (see Risks table); not required for MVP
- [ ] `qod.py` — not yet started; lower priority since it's only used for the Video KYC step-up path, not core scoring
- [ ] Every team member should register individually and get their own App Key (currently only one key is in use — fine for now, but good practice before final submission in case of rate limits)

**Exit criteria: ✅ MET.** Three real, live-tested CAMARA APIs are integrated and verifiable with one script.

### Exit criteria updated: ✅ MET for SIM Swap
You can make a real CAMARA API call (SIM Swap) and see a live JSON response — done. Same pattern needs replicating for Device Swap and Location Verification next.

---

### Phase C — AI Agent Design
- [ ] Define the Agent's reasoning loop explicitly: **Observe → Reason → Act → Explain**
- [ ] `orchestrator.py`: given a transaction, decide *which* signals to fetch (don't always call all APIs blindly — this is what makes it "agentic" vs "rules engine")
- [ ] `trust_engine.py`: implement the initial heuristic weights (clearly commented as `INITIAL_HEURISTIC_WEIGHTS`, not scientific)
  ```python
  INITIAL_HEURISTIC_WEIGHTS = {
      "number_verified": +30,
      "known_device": +15,
      "normal_location": +15,
      "normal_behavior": +10,
      "recent_sim_swap": -25,   # apply time decay
      "new_device": -15,
      "unusual_location": -15,
      "large_amount": -10,
  }
  ```
- [ ] Implement **time decay** for SIM Swap signal (< 24h full weight, < 1 week half weight, > 1 month minimal weight)
- [ ] `recommendation.py`: map Trust Index → 4-tier decision (Allow / Adaptive Verification / Hold / Temporary Freeze)
- [ ] `explainability.py`: output structured reasons list (not just a number) — this is what impresses judges
- [ ] Implement **Cold Start handling**: if no behavioral profile exists, rely 100% on live network signals
- [ ] Implement **Confidence Recovery**: if adaptive verification succeeds, recalculate and raise Trust Index, then allow
- [ ] Implement **Degraded Mode**: if any CAMARA API call fails/times out, don't crash — lower confidence, lean toward "Adaptive Verification" instead of a hard decision

**Exit criteria:** Given a fake transaction JSON, the agent returns `{trust_index, decision, reasons[]}`.

---

### Phase D — Backend
- [ ] `POST /transaction` endpoint: accepts transaction payload, runs it through the Agent, returns decision
- [ ] `GET /transaction/{id}` endpoint: retrieve past decision (for demo replay)
- [ ] `POST /transaction/{id}/verify` endpoint: simulate the user completing Adaptive Verification (Face ID/OTP mock) → triggers Confidence Recovery flow
- [ ] Store every transaction + decision + reasons in the database (for the dashboard to display history)
- [ ] Implement parallel API calls where possible (`asyncio.gather`) to reduce latency
- [ ] Add basic behavioral profile storage (per user: usual city, device, average amount) to support Cold Start vs "seasoned user" distinction
- [ ] Write `requirements.txt` and `.env.example`

**Exit criteria:** You can `curl` or Postman-test a full transaction → decision cycle end-to-end.

---

### Phase E — Frontend / Demo Dashboard
- [ ] `TransactionSimulator.jsx`: form to "trigger" a transaction (amount, or pick a pre-built scenario)
- [ ] `SignalPanel.jsx`: live-updating panel showing each CAMARA signal result as it comes in (this is the "wow" visual for judges — signals lighting up one by one)
- [ ] `TrustIndexGauge.jsx`: visual gauge (0–100) with color zones matching the 4 tiers
- [ ] `DecisionCard.jsx`: shows final decision + the explainable reasons list
- [ ] `ScenarioSelector.jsx`: dropdown/buttons to instantly load one of the 4 demo scenarios (critical for a smooth live demo — no live typing under pressure)
- [ ] Connect frontend to backend via `api/client.js`
- [ ] Basic responsive styling — doesn't need to be fancy, needs to be **clear and readable on a projector**

**Exit criteria:** A judge watching the screen can see: transaction submitted → signals populate live → Trust Index animates → decision + reasons appear.

---

### Phase F — Fraud Scenarios (Test Cases)

Build these as **hardcoded, reliable, one-click scenarios** in the dashboard — do not rely on live random API behavior during the actual demo.

- [ ] **Scenario 1 — Legitimate transaction:** all signals normal → Allow instantly
- [ ] **Scenario 2 — False Positive (the most important one):** SIM swapped today + new device + travel abroad, but Number Verification passes → Adaptive Verification requested → user "passes" Face ID → Confidence Recovery → Allow
- [ ] **Scenario 3 — Suspicious/Medium risk:** recent SIM swap + unknown device + high amount, Number Verification passes → Trust Index medium → Step-Up Verification
- [ ] **Scenario 4 — High risk:** SIM swap very recent + unknown device + unusual location + Number Verification fails + very high amount → Temporary Freeze

- [ ] Write out each scenario script in `docs/demo_scenarios.md` with exact input values and expected output, so whoever presents can follow it verbatim
- [ ] Test each scenario end-to-end at least 5 times to make sure it's reliable before the live demo (Prototype Stability matters in judging)

---

### Phase G — Pitch + Live Demo Packaging
- [ ] Update the existing pptx deck if the mentor session changed any core details (e.g., API names, Trust Index framing)
- [ ] Record the demo video (required for `Video URL` field) — screen recording of the dashboard running Scenario 2 (False Positive) is likely the strongest single clip
- [ ] Write `Instructions to Run` (see Section 7 below — draft is ready)
- [ ] Deploy backend + frontend to a public URL for the `Demo Link` field
- [ ] Push final code to GitHub, double-check `Repository URL` is public/accessible to reviewers
- [ ] Zip source code for the `Source Code` upload field
- [ ] Take 3–5 clean screenshots of the dashboard for the `Snapshots` field
- [ ] Update `Description` field in the submission form (expand from Phase 1 to describe the working prototype, not just the idea)

---

## 5. Risks & Open Questions (update after mentor call)

| Risk | Status | Mitigation |
|---|---|---|
| CAMARA APIs not fully available in sandbox | ✅ Resolved — all 5 confirmed available via official NaC docs | No mock needed unless a specific call misbehaves in practice |
| Number Verification exact response field names unconfirmed | 🟡 Downgraded from 🔴 — operation confirmed to exist (`phoneNumberVerify`), just need exact field names | Test directly in dashboard playground with a simulator number before finalizing `number_verification.py` |
| Two possible client init patterns in Nokia docs (`NetworkAsCodeApi` vs `NetworkAsCodeClient`) | 🟡 Open — needs one real App Key to test | Try `NetworkAsCodeApi` first (used in sim_swap/device_swap code); fall back to the other if auth fails |
| AI Agent implementation must use specific approved tooling | ⏳ Still pending — check Resource & Tooling Guide | Don't hardcode a specific LLM provider until confirmed |
| Scope too large for time remaining | ⏳ Team decision needed | Default to Number Verification + SIM Swap + Device Swap as "core," Location + QoD as enhancement |
| Live demo API latency/failures during judging | Anticipated | Pre-recorded fallback video + hardcoded scenario data as backup |

---

## 6. Submission Form Mapping (Prototype Phase)

| Form Field | Source |
|---|---|
| Title | Reuse/lightly adapt Phase 1 title |
| Description | Expand Phase 1 description with "Current Prototype Status" section |
| Parent Submission | Phase 1 SendGuard submission |
| Theme | Secure Fintech, Payments & Anti-Fraud Innovation |
| Snapshots | Dashboard screenshots (Phase E output) |
| Video URL | Recorded demo (Phase G) |
| Presentation | Updated pptx |
| Demo Link | Deployed frontend URL |
| Repository URL | GitHub repo (this backlog lives there) |
| Source Code | Zipped repo |
| Instructions to Run | See below |

### Draft "Instructions to Run"
```
1. Clone the repository: git clone <repo-url>
2. Backend setup:
   cd backend
   pip install -r requirements.txt
   cp .env.example .env   # fill in CAMARA API credentials
   uvicorn app.main:app --reload
3. Frontend setup:
   cd frontend
   npm install
   npm run dev
4. Open http://localhost:5173 (or deployed URL)
5. Use the Scenario Selector to run any of the 4 demo scenarios
```

---

## 7. Suggested Timeline

| Window | Focus |
|---|---|
| Day 0 (today) | Send mentor email, set up repo skeleton, prep questions |
| Day 0–2 | Mentor session happens → update decisions log |
| Day 2–4 | Phase B (API reality check) + Phase C (AI Agent core logic) |
| Day 4–7 | Phase D (Backend) in parallel with Phase E (Frontend UI shell) |
| Day 7–9 | Connect frontend ↔ backend, build all 4 scenarios (Phase F) |
| Day 9–11 | Stability testing, rehearse live demo, record video |
| Final 1–2 days | Submission packaging (Phase G), buffer for bugs |

*(Adjust exact dates once the final submission deadline is confirmed — this backlog assumes roughly a 2-week build window from mentorship start.)*

---

## 8. Team Roles (fill in)

| Name | Primary Focus |
|---|---|
| | Backend / AI Agent |
| | Frontend / Dashboard |
| | CAMARA integration / mentor liaison |
| | Pitch / Demo script / Video |

---

## 9.5. FRONTEND HANDOFF GUIDE — Standalone Instructions for the Frontend Teammate

**This section is self-contained.** If you're building the frontend and weren't part of every earlier discussion, everything you need is here. You do not need to wait for the backend to be 100% finished — Step 3 gives you a mock data contract so you can build and test the entire UI independently, then plug in the real backend in five minutes at the end.

### What you're building

A dashboard with one main screen that:
1. Lets someone pick one of 4 pre-built demo scenarios (or manually trigger a transaction)
2. Shows each CAMARA signal (Number Verification, SIM Swap, Device Swap, Location Verification) lighting up live as results come in
3. Shows a Trust Index gauge (0–100)
4. Shows the final decision (Allow / Adaptive Verification / Transaction Hold / Temporary Freeze) with a list of plain-English reasons

This is the screen judges will watch during the live demo — it needs to look clean and be easy to follow on a projector, not necessarily fancy.

### Step 1 — Prerequisites

- Install [Node.js](https://nodejs.org) (LTS version, 18 or higher) if not already installed
- Check it worked: `node -v` and `npm -v` in your terminal

### Step 2 — Scaffold the project

From the root of the `sendguard` repo:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

Then install the only extra dependency we need:

```bash
npm install axios
```

(We're keeping dependencies minimal on purpose — no need for a heavy UI framework. Plain CSS or basic Tailwind is enough for this dashboard. If you're comfortable with Tailwind, feel free to add it: `npm install -D tailwindcss postcss autoprefixer` and run `npx tailwindcss init -p`.)

Test it works:
```bash
npm run dev
```
Open the URL it gives you (usually `http://localhost:5173`) — you should see the default Vite+React starter page.

### Step 3 — THE API CONTRACT (build against this before the backend is ready)

This is the JSON shape the backend will send/receive. Build your UI against this now using fake/mock data — don't wait for the backend team.

**Request — triggering a transaction:**
```json
POST /transaction
{
  "scenario": "legitimate",
  "amount": 5000,
  "phone_number": "+99999991000"
}
```
`scenario` will be one of: `"legitimate"`, `"false_positive"`, `"suspicious"`, `"high_risk"` — these map directly to the 4 demo scenarios in `docs/demo_scenarios.md`.

**Response — the decision:**
```json
{
  "transaction_id": "txn_001",
  "trust_index": 42,
  "decision": "ADAPTIVE_VERIFICATION",
  "signals": {
    "number_verification": { "verified": true },
    "sim_swap": { "swapped_recently": true, "hours_since_swap": 2.5, "weight": -25 },
    "device_swap": { "swapped_recently": true, "hours_since_swap": 3.1, "weight": -15 },
    "location_verification": { "verified": false, "verification_result": "FALSE" }
  },
  "reasons": [
    "Number verified (+30)",
    "Recent SIM change 2.5h ago (-25)",
    "New device detected 3.1h ago (-15)",
    "Location outside usual pattern (-15)"
  ]
}
```
`decision` will be one of: `"ALLOW"`, `"ADAPTIVE_VERIFICATION"`, `"TRANSACTION_HOLD"`, `"TEMPORARY_FREEZE"`.

**Request — completing step-up verification (Confidence Recovery flow):**
```json
POST /transaction/txn_001/verify
{ "verification_method": "face_id", "success": true }
```

**Response — updated decision after recovery:**
```json
{
  "transaction_id": "txn_001",
  "trust_index": 82,
  "decision": "ALLOW",
  "reasons": ["Additional verification succeeded (+40)", "Confidence recovered"]
}
```

⚠️ **This contract may shift slightly once the real backend is built** — that's fine, it's a starting point. Whoever's on backend should confirm/update this section once `trust_engine.py` is finalized.

### Step 4 — Folder structure

Inside `frontend/src/`:
```
src/
├── App.jsx
├── components/
│   ├── ScenarioSelector.jsx       # buttons/dropdown: pick 1 of 4 scenarios
│   ├── TransactionSimulator.jsx   # shows amount/phone, "Run Transaction" button
│   ├── SignalPanel.jsx            # 4 cards, one per CAMARA signal, light up as results arrive
│   ├── TrustIndexGauge.jsx        # visual 0-100 gauge, color-coded by tier
│   └── DecisionCard.jsx           # final decision + reasons list
└── api/
    └── client.js                  # all backend calls live here — the ONLY file that changes when backend is ready
```

### Step 5 — Build with a mock first (`api/client.js`)

Write this file FIRST, using fake data matching the contract above. This lets every component be built and tested without a real backend running:

```javascript
// api/client.js
const USE_MOCK = true; // flip to false once backend is ready
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const MOCK_RESPONSES = {
  legitimate: {
    transaction_id: "txn_mock_1", trust_index: 95, decision: "ALLOW",
    signals: {
      number_verification: { verified: true },
      sim_swap: { swapped_recently: false, weight: 0 },
      device_swap: { swapped_recently: false, weight: 0 },
      location_verification: { verified: true, verification_result: "TRUE" },
    },
    reasons: ["Number verified (+30)", "Known device (+15)", "Normal location (+15)", "Normal behavior (+10)"],
  },
  false_positive: {
    transaction_id: "txn_mock_2", trust_index: 20, decision: "ADAPTIVE_VERIFICATION",
    signals: {
      number_verification: { verified: true },
      sim_swap: { swapped_recently: true, hours_since_swap: 3, weight: -25 },
      device_swap: { swapped_recently: true, hours_since_swap: 5, weight: -15 },
      location_verification: { verified: false, verification_result: "FALSE" },
    },
    reasons: ["Number verified (+30)", "Recent SIM change 3h ago (-25)", "New device 5h ago (-15)", "Unusual location (-15)"],
  },
  suspicious: {
    transaction_id: "txn_mock_3", trust_index: 45, decision: "TRANSACTION_HOLD",
    signals: {
      number_verification: { verified: true },
      sim_swap: { swapped_recently: true, hours_since_swap: 1, weight: -25 },
      device_swap: { swapped_recently: true, hours_since_swap: 1, weight: -15 },
      location_verification: { verified: false, verification_result: "FALSE" },
    },
    reasons: ["Number verified (+30)", "Very recent SIM change (-25)", "Unknown device (-15)", "Large amount (-10)"],
  },
  high_risk: {
    transaction_id: "txn_mock_4", trust_index: 8, decision: "TEMPORARY_FREEZE",
    signals: {
      number_verification: { verified: false },
      sim_swap: { swapped_recently: true, hours_since_swap: 0.5, weight: -25 },
      device_swap: { swapped_recently: true, hours_since_swap: 0.5, weight: -15 },
      location_verification: { verified: false, verification_result: "FALSE" },
    },
    reasons: ["Number verification FAILED", "Very recent SIM change (-25)", "Unknown device (-15)", "Unusual location (-15)", "Very large amount (-10)"],
  },
};

export async function runTransaction(scenario, amount, phoneNumber) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800)); // simulate network delay
    return MOCK_RESPONSES[scenario];
  }
  const axios = (await import("axios")).default;
  const res = await axios.post(`${API_BASE}/transaction`, {
    scenario, amount, phone_number: phoneNumber,
  });
  return res.data;
}

export async function submitVerification(transactionId, method, success) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { transaction_id: transactionId, trust_index: 82, decision: "ALLOW",
      reasons: ["Additional verification succeeded (+40)", "Confidence recovered"] };
  }
  const axios = (await import("axios")).default;
  const res = await axios.post(`${API_BASE}/transaction/${transactionId}/verify`, {
    verification_method: method, success,
  });
  return res.data;
}
```

### Step 6 — Build order (do them in this order, test each before moving on)

1. **`ScenarioSelector.jsx`** — 4 buttons (Legitimate / False Positive / Suspicious / High Risk). On click, calls `runTransaction(scenario, ...)` from `api/client.js` and passes the result up to `App.jsx` state.
2. **`TrustIndexGauge.jsx`** — takes `trustIndex` (0–100) as a prop, renders a simple colored bar or arc: green (80-100), teal (50-79), orange (25-49), red (0-24). Plain SVG or CSS is enough — no need for a charting library for one number.
3. **`SignalPanel.jsx`** — takes the `signals` object as a prop, renders 4 small cards (one per CAMARA API) showing pass/fail or the swap recency, with a subtle animation/highlight as each populates.
4. **`DecisionCard.jsx`** — takes `decision` and `reasons[]` as props, shows the decision name (styled distinctly per tier — same colors as the gauge) and the bullet list of reasons.
5. **`TransactionSimulator.jsx`** — optional manual mode: amount input + phone number input + "Run" button, for anything beyond the 4 fixed scenarios.
6. **`App.jsx`** — wires everything together: holds the current transaction result in state, passes it down to the 4 components above, and (for the False Positive / Suspicious scenarios) shows a "Verify Identity" button that calls `submitVerification(...)` and updates the state with the recovered Trust Index — this is how you demo **Confidence Recovery** live.

### Step 7 — Visual style (match the pitch deck)

Reuse the exact color palette from the pptx deck so the demo feels like one consistent product:
- Background: dark navy (`#0a1e2c` / `#0d2436` range)
- Accent / positive: teal (`#14b8a6` range)
- Risk tiers: green → teal → orange → red (same 4-tier colors as the "Trust Index → 4 Graduated Decisions" slide)
- Font: whatever the deck uses for headers (serif, bold) for titles; clean sans-serif for body text

### Step 8 — Switch from mock to real backend (once Phase D is done)

In `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```
Then in `api/client.js`, flip `USE_MOCK = false`. That's it — nothing else should need to change if the contract in Step 3 was followed.

### Step 9 — Git workflow

```bash
git checkout -b feature/frontend-dashboard
# ... build everything ...
git add frontend/
git commit -m "feat: frontend dashboard with 4 demo scenarios, signal panel, trust gauge, and decision card (mock data mode)"
git push -u origin feature/frontend-dashboard
```
Open a PR into `main` when ready for the team to review.

---



1. **Never hardcode `SIM Swap → Block`.** Always route through the multi-signal Trust Engine.
2. **Never claim the weights are "scientifically validated."** They are `INITIAL_HEURISTIC_WEIGHTS` — say so in the pitch.
3. **Always have a hardcoded fallback** for every live demo scenario in case a real API call fails during judging.
4. **Deep > Wide.** A rock-solid integration with 2–3 APIs beats a shaky integration with 5.
5. **The demo must show the Agent reasoning, not just a final number.** Judges want to see *why*.