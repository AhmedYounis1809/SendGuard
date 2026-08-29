# SendGuard — Project Backlog & Execution Plan
### GSMA MENA Ignite Hackathon — Finals / Prototype Phase

**Theme:** Secure Fintech, Payments & Anti-Fraud Innovation
**Tech Stack:** Python (FastAPI) backend + AI Agent · React (JS) frontend
**Mentor:** Sulaiman S. Alharbi (STC) — session must happen before **10 Sep 2026**

---

## 0. One-Line Pitch (keep this pinned at the top of the repo README too)

> SendGuard is an AI-powered trust orchestration layer that sits between financial apps (wallets, banks) and telecom network intelligence (CAMARA APIs), turning fraud detection from a binary block/allow decision into a graduated, explainable trust assessment.

---

## 1. IMMEDIATE — Before/During the Mentor Session

These do **not** require mentor input and should be done in parallel while waiting for the mentor to reply.

- [ ] Create the GitHub repository (private, add teammates as collaborators)
- [ ] Set up repo skeleton (see Section 3)
- [ ] Write down the finalized 7 mentor questions (from prior planning) somewhere visible (`docs/mentor_questions.md`) — bring them to the call, check them off live
- [ ] Prepare the 2–3 minute verbal pitch (problem → SendGuard → transaction → CAMARA signals → AI Agent → Trust Index → recommendation) and rehearse it with a timer
- [ ] Confirm mentor session time — if no reply within 24h, send a polite follow-up

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
| Database | SQLite (prototype) → Postgres if time allows | Stores transaction logs, user behavioral profiles, decision history |
| Hosting (Demo) | Render / Railway (backend) + Vercel (frontend) | Pick whichever is fastest to deploy for the team |
| API mocking | Local mock server for any CAMARA API not available/stable in sandbox | Critical fallback — see Section 6 |

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
│   │   │   ├── device_swap.py     # or device_status.py — confirm naming w/ mentor
│   │   │   ├── location_verification.py
│   │   │   ├── qod.py
│   │   │   └── mock/              # Mock responses for any unavailable API
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

### Phase B — API Reality Check (Post-Mentor)
- [ ] Update `docs/decisions_log.md` with mentor's answers to all 7 questions
- [ ] Confirm final list of 2–3 "core" APIs vs "stretch" APIs
- [ ] Get Nokia Network-as-Code sandbox credentials working (test a basic call)
- [ ] For any API not realistically usable in time: build a `mock/` response matching real API schema, clearly labeled as MOCK in code comments and in the demo narration
- [ ] Document exact request/response shape for each API in `docs/architecture.md`

**Exit criteria:** You can make at least one real (or realistic mock) CAMARA API call and see a JSON response.

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
| CAMARA APIs not fully available in sandbox | ⏳ Pending mentor confirmation | Build clearly-labeled mocks matching real schema |
| AI Agent implementation must use specific approved tooling | ⏳ Pending Resource & Tooling Guide review | Don't hardcode a specific LLM provider until confirmed |
| Scope too large for time remaining | ⏳ Pending mentor's MVP recommendation | Default to Number Verification + SIM Swap + one more (Device or Location) as "core," rest as stretch |
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

## 9. Golden Rules (don't forget these under pressure)

1. **Never hardcode `SIM Swap → Block`.** Always route through the multi-signal Trust Engine.
2. **Never claim the weights are "scientifically validated."** They are `INITIAL_HEURISTIC_WEIGHTS` — say so in the pitch.
3. **Always have a hardcoded fallback** for every live demo scenario in case a real API call fails during judging.
4. **Deep > Wide.** A rock-solid integration with 2–3 APIs beats a shaky integration with 5.
5. **The demo must show the Agent reasoning, not just a final number.** Judges want to see *why*.