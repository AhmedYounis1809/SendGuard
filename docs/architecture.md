# SendGuard — Technical Architecture

## 1. Purpose

This document describes the implementation architecture of SendGuard.

SendGuard is designed as a security layer between a financial platform and telecom/network intelligence.

The system has one central responsibility:

> **Use an AI Agent to orchestrate network evidence collection, then use deterministic logic to convert that evidence into an explainable transaction-trust decision.**

The architecture deliberately separates:

```text
AI reasoning / orchestration
            from
financial risk arithmetic
```

This prevents the LLM from directly inventing the Trust Index while still allowing the Agent to dynamically decide which telecom evidence should be collected.

---

# 2. System Architecture

```text
                         BANK / FINTECH
                               │
                               │
                               │ Transaction Context
                               ▼
                    ┌────────────────────────┐
                    │      FastAPI API       │
                    │      app/main.py       │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │       Agent Layer      │
                    │                        │
                    │      agent.py          │
                    │   orchestrator.py      │
                    │   llm_client.py        │
                    └───────────┬────────────┘
                                │
                      Tool selection / calls
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
      SIM Swap Tool       Device Swap Tool   Location Tool
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │    CAMARA Layer        │
                    │                        │
                    │ Live → Nokia NaaS      │
                    │ Demo → Scenario State  │
                    └───────────┬────────────┘
                                │
                                ▼
                       Collected Evidence
                                │
                                ▼
                    ┌────────────────────────┐
                    │     Trust Engine       │
                    │    trust_engine.py     │
                    │                        │
                    │ Deterministic scoring  │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Risk Tier Mapping    │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Recommendation Layer   │
                    │ recommendation.py      │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │      Actions           │
                    │       actions.py       │
                    └───────────┬────────────┘
                                │
                                ▼
                         BANK / FINTECH
```

---

# 3. Repository Responsibilities

## `backend/app/main.py`

The FastAPI entrypoint.

It exposes:

```text
GET  /health
POST /api/camara/verify
POST /api/agent/run
POST /api/scenarios/{scenario_id}/run
```

The scenario endpoint is the main scripted-demo entrypoint.

---

## `backend/app/agent/agent.py`

This is the top-level Agent pipeline.

The main entrypoint is:

```python
run_agent(transaction_context)
```

Its responsibility is to connect the major stages:

```text
Investigation
     ↓
Trust Assessment
     ↓
Recommendation
     ↓
Action Execution
```

Conceptually:

```python
collected_signals = decide_and_fetch_signals(context)

assessment = compute_trust(
    collected_signals,
    context
)

action = recommend_action(
    assessment.tier,
    context,
    assessment.degraded_signals,
    assessment.reasons
)

execution = execute_action(
    action,
    context
)
```

---

# 4. Agent Orchestration

## `backend/app/agent/orchestrator.py`

This file defines the available Agent tools and applies Python-side policy guardrails.

Current tools:

```text
check_sim_swap_tool
check_device_swap_tool
check_location_tool
```

The Agent does not directly invoke CAMARA adapter functions.

Instead:

```text
LLM
 ↓
Tool name
 ↓
Python tool wrapper
 ↓
Demo mode OR live CAMARA adapter
```

This creates a clean boundary between LLM function calling and external network APIs.

---

# 5. Tool Execution Boundary

The tool wrappers follow the same pattern.

Example:

```text
check_sim_swap_tool()
        │
        ▼
get_demo_signal()
        │
   ┌────┴─────┐
 Demo        Live
   │           │
   ▼           ▼
Mock state   CAMARA adapter
   │           │
   └────┬──────┘
        ▼
   Tool response
```

The Agent therefore sees the same interface in both modes.

It does not need to know whether the returned data came from the demo signal layer or a live CAMARA integration.

---

# 6. Demo Mode

## `backend/app/agent/demo_mode.py`

Demo mode is request-local.

It uses a `contextvars.ContextVar` rather than a plain process-global variable.

This matters because FastAPI can process multiple requests concurrently.

The demo state is set at the beginning of a scenario request:

```python
set_demo_signals(DEMO_SCENARIO_SIGNALS[scenario_id])
```

The Agent then performs its normal tool calls.

Every tool first checks:

```python
get_demo_signal(tool_name)
```

If a demo scenario is active, a scenario-controlled signal is returned.

If no demo is active, the tool falls through to the real CAMARA adapter.

At the end of the request:

```python
set_demo_signals(None)
```

This guarantees that a demo state does not leak into a later live request.

---

# 7. Demo Scenario Definitions

## `backend/app/agent/demo_scenarios.py`

This file contains only the **telecom/network evidence** for the six scenarios.

The transaction context itself comes from the frontend request.

This separation is intentional.

For example:

```text
Frontend:
50,000 EGP
New beneficiary
2 recent transactions
No location reference

Backend demo scenario:
SIM change 1h ago
Device change 1.5h ago
```

The final result is derived from both.

The scenario definitions do not hardcode:

```text
Trust Index
Tier
Action
```

They only define the network evidence available to the tools.

---

# 8. AI Investigation

## `backend/app/agent/llm_client.py`

The investigation engine has three levels:

```text
Gemini
  ↓ failure
Groq
  ↓ failure
Deterministic fallback
```

### Gemini investigation

Gemini uses iterative tool calling.

The flow is:

```text
Context
  ↓
Gemini chooses tools
  ↓
Python executes tools
  ↓
Results sent back to Gemini
  ↓
Gemini decides whether more evidence is needed
  ↓
Repeat until sufficient evidence
```

A maximum round limit prevents infinite loops.

---

## Groq investigation

Groq follows the same conceptual multi-step investigation pattern.

```text
Context
  ↓
Groq chooses tool(s)
  ↓
Python executes tool(s)
  ↓
Tool results returned to Groq
  ↓
Groq decides whether another tool is required
  ↓
Continue / stop
```

This is important because the fallback provider should still behave like an investigation agent rather than a one-shot tool selector.

---

## Deterministic investigation fallback

If both LLM providers fail, the system can use a deterministic evidence-gathering path.

This allows the transaction pipeline to remain operational.

The deterministic fallback does not calculate the Trust Index differently.

It only replaces the missing LLM orchestration step.

---

# 9. Investigation vs Risk Calculation

This separation is one of the most important architectural decisions in SendGuard.

### Agent

Answers:

> **What evidence should I collect?**

### Trust Engine

Answers:

> **Given the evidence, what is the Trust Index?**

The Agent does not output:

```text
"risk = 87%"
```

Instead it returns evidence such as:

```json
{
  "check_sim_swap_tool": {
    "swapped_recently": true,
    "hours_since_swap": 1
  },
  "check_device_swap_tool": {
    "swapped_recently": true,
    "hours_since_swap": 1.5
  }
}
```

The Trust Engine then performs the calculation.

---

# 10. Trust Engine

## `backend/app/agent/trust_engine.py`

The Trust Engine is deterministic.

Inputs:

```text
Transaction Context
+
Collected Telecom Signals
```

Output:

```text
TrustAssessment
```

The assessment contains:

```text
trust_index
tier
contributions
degraded_signals
uncalled_signals
reasons
```

---

# 11. Trust Calculation

The calculation begins at:

```text
BASE_TRUST = 90
```

Then signal contributions are applied.

Current weights:

```text
Location verified            +3
Location not verified       -20
No location reference        -5

Familiar beneficiary         +5
New beneficiary             -10

Transaction burst           -20
Large amount                 -8
```

Time-decay signals:

```text
SIM change <24h             -25
SIM change <7d              -10
SIM change <30d              -2

Device change <24h          -25
Device change <7d             -8
Device change <30d            -2
```

Current thresholds:

```text
Large amount:
>= 25,000 EGP

Burst:
>= 3 transactions / 10 minutes
```

The score is clamped:

```text
0 <= Trust Index <= 100
```

---

# 12. Risk Tier Mapping

The tier function is deterministic:

```text
80–100
    ALLOW

50–79
    ADAPTIVE_VERIFICATION

25–49
    TRANSACTION_HOLD

0–24
    TEMPORARY_FREEZE
```

No LLM call occurs here.

---

# 13. Missing vs Degraded Evidence

SendGuard distinguishes between:

### Uncalled signal

The Agent decided the signal was not needed.

Example:

```text
Location reference unavailable
→ Location tool is not called
```

This is stored in:

```text
uncalled_signals
```

### Degraded signal

The Agent attempted the check, but it failed.

Example:

```text
Device Swap API unavailable
```

This becomes:

```text
degraded_signals
```

A degraded signal is treated as unknown rather than safe.

The current implementation applies:

```text
DEGRADED_SCORE_CAP = 75
```

This prevents incomplete evidence from silently producing a fully trusted ALLOW.

---

# 14. Location Policy Guardrail

Location is only valid when the transaction has an expected reference.

The policy function checks:

```text
location_reference_available
```

and also requires:

```text
usual_latitude
usual_longitude
```

If these are missing, the tool request is rejected before execution.

This rule applies regardless of whether Gemini, Groq, or the deterministic path is controlling the investigation.

---

# 15. Recommendation Layer

## `backend/app/agent/recommendation.py`

Once the Trust Engine determines the tier, the recommendation layer determines the allowed action.

Allowed actions are constrained by tier.

```text
ALLOW
    ALLOW
    ALLOW_WITH_FRAUD_WARNING

ADAPTIVE_VERIFICATION
    TRANSACTION_CONFIRMATION
    TRUSTED_DEVICE_CONFIRMATION

TRANSACTION_HOLD
    TEMPORARY_SAFETY_HOLD
    OUT_OF_BAND_VERIFICATION

TEMPORARY_FREEZE
    TEMPORARY_FREEZE_MANUAL_REVIEW
```

The LLM may choose among actions allowed for that tier.

It cannot choose an action outside the allowed set.

For example:

```text
Tier = TRANSACTION_HOLD

Allowed:
TEMPORARY_SAFETY_HOLD
OUT_OF_BAND_VERIFICATION

Not allowed:
ALLOW
TEMPORARY_FREEZE_MANUAL_REVIEW
```

This is another Python-side safety boundary.

---

# 16. Action Execution

## `backend/app/agent/actions.py`

This layer translates the recommended action into the system response / execution behavior.

The architecture therefore separates:

```text
Risk assessment
        from
Action recommendation
        from
Action execution
```

This allows the bank or financial platform to remain the owner of the real transaction-control boundary in a production deployment.

---

# 17. Frontend Architecture

The React frontend is organized by feature.

```text
frontend/src/
│
├── core/
│   ├── config/
│   ├── i18n/
│   ├── network/
│   └── theme/
│
└── features/
    ├── camara-verification/
    ├── navigation/
    ├── settings/
    └── trust-dashboard/
```

The main Trust Dashboard feature contains:

```text
data/
    demo-scenarios.ts

api/
    scenario.api.ts

hooks/
    use-scenario-runner.ts

components/
    dashboard-view.tsx
    trust-index-gauge.tsx
```

The frontend therefore owns the user-facing presentation and scenario selection, while the backend remains authoritative for investigation, scoring, and decision logic.

---

# 18. End-to-End Demo Request

A demo request follows this flow:

```text
1. User selects scenario
             ↓
2. Frontend sends transaction context
             ↓
3. FastAPI receives scenario_id
             ↓
4. Backend loads scenario network evidence
             ↓
5. Demo state is activated
             ↓
6. AI Agent analyzes transaction context
             ↓
7. Agent selects telecom tools
             ↓
8. Policy guardrails validate tool calls
             ↓
9. Demo tools return scenario-controlled evidence
             ↓
10. Agent decides whether more evidence is needed
             ↓
11. Trust Engine calculates Trust Index
             ↓
12. Trust Engine maps score to tier
             ↓
13. Recommendation layer chooses allowed action
             ↓
14. Action layer executes / represents the result
             ↓
15. Backend returns explainable response
             ↓
16. Demo state is cleared
             ↓
17. Frontend renders the decision
```

---

# 19. Example: Scenario 6

Input:

```json
{
  "amount": 50000,
  "is_new_beneficiary": true,
  "recent_transaction_count_10min": 2,
  "location_reference_available": false,
  "trusted_device_available": false
}
```

Agent investigation:

```text
SIM Swap
Device Swap
Location skipped
```

Demo signals:

```text
SIM change: 1h
Device change: 1.5h
```

Trust calculation:

```text
90
-25 SIM
-25 Device
-10 New beneficiary
-8 Large amount
-5 No location reference
= 17
```

Tier:

```text
17
↓
TEMPORARY_FREEZE
```

Action:

```text
TEMPORARY_FREEZE_MANUAL_REVIEW
```

The frontend can then explain exactly which signals contributed to the decision.

---

# 20. False-Positive Architecture

SendGuard deliberately avoids the rule:

```text
One anomaly = immediate block
```

Instead:

```text
Anomaly
   ↓
Trust decreases
   ↓
Gather additional evidence
   ↓
Adaptive verification
   ↓
Successful verification
   ↓
Trust recovery
   ↓
Re-evaluate
```

The current Trust Engine exposes:

```python
apply_verification_recovery(...)
```

which adds transaction-specific evidence from successful verification without re-running unchanged telecom checks.

This allows a legitimate user to recover from a flagged state.

---

# 21. Why the Architecture Is Split This Way

The architecture gives each component one clear responsibility:

| Component      | Responsibility                       |
| -------------- | ------------------------------------ |
| Frontend       | Scenario selection and visualization |
| FastAPI        | Request boundary                     |
| AI Agent       | Evidence orchestration               |
| CAMARA tools   | Network evidence retrieval           |
| Demo mode      | Deterministic scenario evidence      |
| Trust Engine   | Deterministic scoring                |
| Recommendation | Allowed action selection             |
| Actions        | Execution representation             |
| Fallback chain | Availability and resilience          |

The result is an architecture where:

```text
LLM = reasoning / orchestration
Python = policy / scoring / safety
CAMARA = network evidence
Frontend = visualization
```

---

# 22. Production Evolution

The prototype can evolve without replacing the core architecture.

Potential next steps include:

* production consent and authorization flows
* additional CAMARA signals
* institution-specific policy configuration
* calibrated fraud models
* outcome-based weight adjustment
* audit logging
* distributed tracing
* rate limiting
* secure secret management
* horizontal scaling
* model evaluation and monitoring
* multi-operator deployment

The key architecture can remain:

```text
Financial Context
       +
Network Evidence
       ↓
AI Orchestration
       ↓
Deterministic Trust
       ↓
Adaptive Decision
```
