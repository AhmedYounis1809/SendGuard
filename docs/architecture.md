# SendGuard — Technical Architecture

## 1. Purpose

This document describes the implementation architecture of SendGuard.

SendGuard is designed as a security layer between a financial platform and telecom/network intelligence.

The system has one central responsibility:

> **Use an AI Agent to orchestrate network evidence collection, then use deterministic logic to convert that evidence into an explainable transaction-trust decision.**

The architecture deliberately separates:

```text
AI reasoning / evidence orchestration

            from

financial risk arithmetic and policy
```

This prevents the LLM from directly inventing the Trust Index while still allowing the Agent to dynamically determine which telecom evidence should be collected.

The investigation Agent is implemented using **Pydantic AI**.

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
                    ┌──────────────────────────────┐
                    │         Agent Layer           │
                    │                              │
                    │          agent.py            │
                    │    Pydantic AI Agent         │
                    │        llm_client.py         │
                    │      orchestrator.py         │
                    │   investigation_state.py     │
                    └──────────────┬───────────────┘
                                   │
                          Agent tool selection
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       SIM Swap Tool        Device Swap Tool      Location Tool
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
                    ┌────────────────────────┐
                    │     CAMARA Layer       │
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
                    │      Trust Engine      │
                    │    trust_engine.py     │
                    │                        │
                    │  Deterministic scoring │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │     Risk Tier Mapping  │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Recommendation Layer │
                    │   recommendation.py    │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │        Actions         │
                    │        actions.py      │
                    └───────────┬────────────┘
                                │
                                ▼
                         BANK / FINTECH
```

The major architectural boundary is:

```text
Pydantic AI
    ↓
AI reasoning and evidence orchestration

Python
    ↓
Policy guardrails and deterministic financial-risk calculation

CAMARA
    ↓
Telecom/network evidence

Frontend
    ↓
Scenario selection and visualization
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

The API layer is responsible for receiving the transaction context and routing the request into the SendGuard Agent pipeline.

---

## `backend/app/agent/agent.py`

This is the top-level SendGuard pipeline.

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

The top-level Agent pipeline therefore coordinates the investigation, scoring, recommendation, and execution stages without moving the financial-risk calculation into the LLM.

---

# 4. Agent Orchestration

## `backend/app/agent/orchestrator.py`

This file defines the tools exposed to the SendGuard investigation Agent and applies Python-side policy guardrails.

Current tools:

```text
check_sim_swap_tool
check_device_swap_tool
check_location_tool
```

The investigation Agent is implemented using **Pydantic AI**.

The Agent does not directly invoke CAMARA adapter functions.

Instead:

```text
Pydantic AI Agent
        ↓
Tool selection
        ↓
Python tool wrapper
        ↓
Policy guardrails
        ↓
Demo Signal Provider OR Live CAMARA Adapter
        ↓
Tool response
        ↓
Pydantic AI Agent
```

This creates a clean boundary between:

```text
AI reasoning
        and
Python execution policy
        and
external network APIs
```

The CAMARA functions are therefore exposed to the Agent as tools that it can decide to call based on the transaction context.

## Multi-Step Investigation

The investigation is iterative rather than a single tool-selection operation.

```text
Transaction Context
        ↓
Pydantic AI Agent
        ↓
Select relevant tool
        ↓
Execute Python tool
        ↓
Receive tool result
        ↓
Reason over collected evidence
        ↓
Select another tool if required
        ↓
Finish investigation
```

This allows SendGuard to perform agentic evidence orchestration instead of executing a fixed sequence of network checks.

The Agent decides:

> **What evidence should be collected?**

The Trust Engine decides:

> **How does the collected evidence affect transaction trust?**

---

# 5. Tool Execution Boundary

The tool wrappers follow the same execution pattern.

For example:

```text
check_sim_swap_tool()
        │
        ▼
get_demo_signal()
        │
   ┌────┴─────┐
  Demo       Live
   │           │
   ▼           ▼
Scenario      CAMARA
Signal        Adapter
   │           │
   └────┬──────┘
        ▼
   Tool response
        │
        ▼
Pydantic AI Agent
```

The Agent therefore sees the same tool interface in both demo and live execution.

It does not need to know whether the returned evidence came from:

```text
Demo Signal Provider
```

or:

```text
Live CAMARA Adapter
```

This abstraction allows the Agent logic to remain unchanged between demonstration and live integration.

---

# 6. Demo Mode

## `backend/app/agent/demo_mode.py`

Demo mode is request-local.

It uses a `contextvars.ContextVar` rather than a plain process-global variable.

This matters because FastAPI can process multiple requests concurrently.

The demo state is activated at the beginning of a scenario request:

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

This guarantees that scenario-specific network evidence does not leak into a later request.

The Agent itself is therefore unchanged by demo mode.

Only the source of the tool response changes.

---

# 7. Demo Scenario Definitions

## `backend/app/agent/demo_scenarios.py`

This file contains only the **telecom/network evidence** for the six demo scenarios.

The financial transaction context comes from the frontend request.

This separation is intentional.

For example:

```text
Frontend transaction context:

50,000 EGP
New beneficiary
2 recent transactions
No location reference

Backend demo network evidence:

SIM change 1h ago
Device change 1.5h ago
```

The final result is derived from both.

The scenario definitions do not hardcode:

```text
Trust Index
Risk Tier
Action
```

They only define the network evidence available to the tools.

This keeps the demo reproducible without bypassing the real Agent → Tool → Trust Engine pipeline.

---

# 8. AI Investigation

## `backend/app/agent/llm_client.py`

The SendGuard investigation layer uses **Pydantic AI** as the Agent runtime.

The investigation provider architecture is:

```text
Pydantic AI Investigation Agent
                │
                ▼
             Gemini
                │
                │ provider failure
                ▼
              Groq
                │
                │ both unavailable
                ▼
Deterministic Evidence Collection
```

The purpose of the investigation Agent is to determine what telecom evidence should be collected for the current transaction.

It does not calculate the final Trust Index.

---

## Gemini Investigation

Gemini is the primary investigation model.

The Pydantic AI Agent can perform iterative tool calling:

```text
Transaction Context
        ↓
Pydantic AI Agent
        ↓
Gemini
        ↓
Choose relevant tool
        ↓
Python tool execution
        ↓
Tool result
        ↓
Gemini reasons over result
        ↓
More tool calls if needed
        ↓
Investigation complete
```

This means the Agent can perform multiple CAMARA tool calls during one investigation when the available context indicates that additional evidence may be useful.

The Agent is not required to blindly call every tool.

---

## Groq Investigation

Groq is available as the fallback investigation provider.

The fallback follows the same conceptual multi-step investigation pattern:

```text
Transaction Context
        ↓
Pydantic AI Agent
        ↓
Groq
        ↓
Choose tool(s)
        ↓
Python executes tool(s)
        ↓
Tool results returned
        ↓
Continue investigation if required
        ↓
Investigation complete
```

The fallback provider therefore remains part of the Agent-oriented investigation flow rather than becoming an unrelated one-shot tool selector.

---

## Deterministic Investigation Fallback

If the LLM investigation providers are unavailable, SendGuard can fall back to deterministic evidence collection.

This fallback exists for availability and resilience.

It does not calculate the Trust Index itself.

Instead, it replaces only the missing LLM evidence-orchestration step:

```text
Gemini Investigation
        OR
Groq Investigation
        OR
Deterministic Evidence Collection
        ↓
Collected Network Evidence
        ↓
Same Trust Engine
```

The Trust Engine therefore receives evidence using the same downstream path regardless of the investigation provider.

---

# 9. Investigation State

## `backend/app/agent/investigation_state.py`

The investigation Agent and its tools need access to request-specific context without changing the public signatures of the CAMARA tool functions.

SendGuard uses Python `ContextVar` objects to maintain request-local investigation state.

The state contains:

```text
transaction_context
checked_tools
collected_signals
```

Conceptually:

```text
FastAPI Request
      ↓
reset_investigation_state()
      ↓
Pydantic AI Agent
      ↓
Tool Call
      ↓
Read / Update ContextVar
      ↓
Tool Result
      ↓
Pydantic AI Agent
```

This allows a tool to keep a simple signature such as:

```python
check_sim_swap_tool(phone_number: str)
```

while still accessing the current investigation context and state.

The request-local state also prevents investigation data from being stored in a shared process-global variable.

This is important for concurrent FastAPI requests because one transaction's investigation state must not leak into another transaction.

The state also tracks successful tool execution so duplicate successful checks can be prevented during a multi-step investigation.

---

# 10. Investigation vs Risk Calculation

This separation is one of the most important architectural decisions in SendGuard.

## Pydantic AI Investigation Agent

Answers:

> **What evidence should I collect?**

The Agent may decide that the transaction requires:

```text
SIM Swap
Device Swap
Location Verification
```

or only a subset of these checks.

The Agent does not output:

```text
Trust Index = 87
```

and it does not directly determine the final risk tier.

Instead, it returns or produces collected evidence.

Example:

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

## Trust Engine

Answers:

> **Given the transaction context and collected evidence, what is the Trust Index?**

The Trust Engine performs deterministic scoring using the transaction context and the network evidence collected during the investigation.

This creates a hard architectural boundary:

```text
Pydantic AI
    ↓
Evidence orchestration

Trust Engine
    ↓
Financial risk arithmetic
```

The LLM cannot directly rewrite or invent the final Trust Index.

---

# 11. Trust Engine

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

The same transaction context and the same collected evidence produce the same Trust Engine result.

This makes the scoring process:

```text
reproducible
explainable
testable
auditable
```

---

# 12. Trust Calculation

The calculation begins at:

```text
BASE_TRUST = 90
```

Then signal contributions are applied.

Current weights:

```text
Location verified          +3
Location not verified     -20
No location reference      -5
Familiar beneficiary       +5
New beneficiary           -10
Transaction burst         -20
Large amount               -8
```

Time-decay signals:

```text
SIM change <24h           -25
SIM change <7d            -10
SIM change <30d            -2
SIM change >=30d            0

Device change <24h        -25
Device change <7d          -8
Device change <30d         -2
Device change >=30d         0
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

These values are **initial prototype heuristics**, not trained or statistically calibrated fraud probabilities.

A production implementation would calibrate these contributions against historical fraud outcomes, false-positive rates, customer behavior, and institution-specific policies.

---

# 13. Risk Tier Mapping

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

No LLM call is required to determine the risk tier.

The tier is derived directly from the deterministic Trust Index.

---

# 14. Missing vs Degraded Evidence

SendGuard distinguishes between evidence that was intentionally not requested and evidence that was requested but unavailable.

## Uncalled Signal

The Agent decided the signal was not needed or could not be meaningfully requested.

Example:

```text
Location reference unavailable

        ↓

Location tool is not called
```

This is represented in:

```text
uncalled_signals
```

An uncalled signal is not automatically interpreted as fraud.

For example, when no usable location reference exists, the system records that the location evidence was unavailable rather than pretending that the user's location was suspicious.

---

## Degraded Signal

The Agent attempted the check, but the external signal could not be reliably obtained.

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

This prevents incomplete or unreliable evidence from silently producing a fully trusted ALLOW result.

---

# 15. Location Policy Guardrail

Location verification is only valid when the transaction has a usable expected location reference.

The Python-side policy checks:

```text
location_reference_available
```

and also requires:

```text
usual_latitude
usual_longitude
```

If these values are missing, the location request is rejected or skipped before execution.

This rule is enforced at the Python tool layer.

It therefore applies regardless of whether Gemini, Groq, or the deterministic investigation path is controlling the investigation.

Conceptually:

```text
Agent requests Location Verification
              ↓
        Python Policy Guard
              ↓
     Is a valid location reference
          available?
        ┌─────┴─────┐
       YES           NO
        │             │
        ▼             ▼
   Execute          Reject / Skip
```

This prevents the Agent from forcing a meaningless location verification call.

---

# 16. Recommendation Layer

## `backend/app/agent/recommendation.py`

Once the Trust Engine determines the risk tier, the recommendation layer determines the allowed action.

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

The recommendation layer is intentionally separate from the Pydantic AI investigation Agent.

The responsibilities are:

```text
Pydantic AI Agent
    ↓
What evidence should be collected?


Trust Engine
    ↓
What Trust Index and risk tier result from that evidence?


Recommendation Layer
    ↓
Which action is appropriate from the actions
already allowed for that tier?
```

The recommendation provider may use LLM assistance to choose between permitted actions.

However, Python-side policy bounds the available choices.

The LLM cannot select an action outside the allowed action set for the current risk tier.

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

This creates another safety boundary around LLM output.

---

# 17. Action Execution

## `backend/app/agent/actions.py`

This layer translates the recommended action into the system response / execution behavior.

The architecture therefore separates:

```text
Risk Assessment
        from
Action Recommendation
        from
Action Execution
```

This separation is intentional.

The bank or financial platform remains responsible for the real transaction-control boundary in a production environment.

SendGuard provides the trust signal, evidence, and recommended security response.

---

# 18. Frontend Architecture

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

The frontend owns:

```text
scenario selection
transaction-context submission
result visualization
```

The backend remains authoritative for:

```text
Agent investigation
network evidence
Trust calculation
risk tier
allowed action
```

This prevents client-side UI logic from becoming the source of truth for financial risk decisions.

---

# 19. End-to-End Demo Request

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
6. Investigation state is initialized
           ↓
7. Pydantic AI Agent analyzes transaction context
           ↓
8. Agent selects telecom tools
           ↓
9. Python policy guardrails validate tool calls
           ↓
10. Demo tools return scenario-controlled evidence
           ↓
11. Agent receives tool results
           ↓
12. Agent decides whether more evidence is needed
           ↓
13. Investigation completes
           ↓
14. Trust Engine calculates Trust Index
           ↓
15. Trust Engine maps score to tier
           ↓
16. Recommendation layer chooses an allowed action
           ↓
17. Action layer executes / represents the result
           ↓
18. Backend returns explainable decision
           ↓
19. Demo state is cleared
           ↓
20. Frontend renders the decision
```

This flow preserves the same architecture in both the scripted demo and the live execution path.

---

# 20. Example: Scenario 6

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

The Pydantic AI investigation Agent identifies the relevant available network evidence.

Expected investigation:

```text
SIM Swap
Device Swap
Location skipped because no valid reference exists
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
-8 Large transaction
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

The frontend can then explain exactly which transaction and network signals contributed to the result.

The result is not produced by the LLM.

The LLM orchestrates evidence collection.

The deterministic Trust Engine produces the final Trust Index and risk tier.

---

# 21. False-Positive Architecture

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
Additional evidence / step-up verification
   ↓
Adaptive verification
   ↓
Successful verification
   ↓
Confidence recovery
   ↓
Re-evaluate
```

A legitimate customer may:

```text
change a SIM
buy a new phone
travel
use a different device
perform an unusual transaction
```

These events do not automatically make the customer fraudulent.

Scenario 3 demonstrates this principle.

```text
Known beneficiary
+
New device

↓

Trust Index = 73

↓

ADAPTIVE_VERIFICATION

↓

TRANSACTION_CONFIRMATION
```

The system therefore treats trust as a transaction-specific state rather than a permanent identity label.

---

# 22. Confidence Recovery

The Trust Engine exposes:

```python
apply_verification_recovery(...)
```

This mechanism allows a successful verification step to increase the previous transaction trust and trigger a new evaluation without unnecessarily re-running unchanged telecom checks.

The concept is:

```text
Initial assessment
        ↓
Adaptive verification
        ↓
Successful verification
        ↓
Confidence recovery
        ↓
Re-evaluation
```

This is designed to reduce unnecessary friction for legitimate customers while still allowing suspicious transactions to receive stronger controls.

---

# 23. Why the Architecture Is Split This Way

The architecture gives each component one clear responsibility:

| Component           | Responsibility                              |
| ------------------- | ------------------------------------------- |
| Frontend            | Scenario selection and visualization        |
| FastAPI             | Request boundary                            |
| Pydantic AI Agent   | AI investigation and evidence orchestration |
| CAMARA tools        | Network evidence retrieval                  |
| Demo mode           | Deterministic scenario evidence             |
| Investigation state | Request-local Agent/tool state              |
| Trust Engine        | Deterministic financial-risk scoring        |
| Recommendation      | Allowed action selection                    |
| Actions             | Execution representation                    |
| Fallback chain      | Provider availability and resilience        |

The resulting separation is:

```text
Pydantic AI = Agent runtime

Gemini / Groq = LLM providers

Python = policy / scoring / safety

CAMARA = network evidence

Frontend = visualization
```

This gives SendGuard a clear boundary between AI reasoning and security-critical deterministic logic.

---

# 24. Reliability Architecture

SendGuard separates investigation reliability from recommendation reliability.

## Investigation

The investigation Agent uses Pydantic AI with Gemini as the primary provider and Groq as the fallback provider.

Conceptually:

```text
Pydantic AI Investigation Agent
          │
          ▼
       Gemini
          │
          │ provider failure / temporary unavailability
          ▼
     Groq fallback
          │
          │ both unavailable
          ▼
Deterministic evidence collection
```

The fallback mechanism exists so that a temporary LLM-provider problem does not necessarily terminate the transaction analysis pipeline.

The deterministic fallback only replaces the Agent's evidence-orchestration step.

The Trust Engine remains deterministic.

## Recommendation

The recommendation layer is separate from the investigation Agent.

Its provider flow is:

```text
Gemini
   ↓ failure
Groq
   ↓ failure
Deterministic action selection
```

The selected action is always constrained by the Trust Engine's allowed actions for the current risk tier.

## Important Boundary

The LLM provider does not control the final Trust Index.

Regardless of whether the investigation was performed through:

```text
Gemini
Groq
Deterministic fallback
```

the same deterministic Trust Engine calculates:

```text
Trust Index
Risk Tier
Allowed Actions
```

This keeps the financial decision boundary independent of the availability or behavior of a particular LLM provider.

---

# 25. Security and Policy Boundaries

The Agent does not have unrestricted authority.

Python-side guardrails are applied before sensitive operations proceed.

Current protections include:

```text
Location reference validation
Duplicate successful tool-call prevention
Allowed-action validation
Request-local investigation state
Demo/live execution separation
Degraded-signal handling
Trust score ceiling for incomplete evidence
```

The architecture therefore follows:

```text
LLM proposes / reasons
        ↓
Python validates
        ↓
Tool executes
```

and later:

```text
LLM-assisted recommendation
        ↓
Python validates allowed actions
        ↓
Action execution
```

This prevents the model from bypassing deterministic policy boundaries.

---

# 26. Privacy and Data Handling

SendGuard is designed to work with technical network signals rather than communication content.

The prototype does not inspect:

```text
phone-call content
SMS content
private conversations
```

The system works with transaction context and network-level verification signals such as:

```text
SIM change
Device change
Location verification
```

A production deployment would require the appropriate:

```text
authorization
consent
privacy controls
data minimization
retention policies
security controls
regulatory requirements
```

for the relevant operator, country, and financial-services environment.

---

# 27. Production Evolution

The prototype can evolve without replacing the core architecture.

Potential next steps include:

```text
production consent and authorization flows
additional CAMARA signals
institution-specific policy configuration
calibrated fraud models
outcome-based weight adjustment
audit logging
distributed tracing
rate limiting
secure secret management
horizontal scaling
model evaluation and monitoring
multi-operator deployment
```

The key architectural pattern can remain:

```text
Financial Context
       +
Network Evidence
       ↓
Pydantic AI Orchestration
       ↓
Deterministic Trust
       ↓
Adaptive Decision
```

The production system could then introduce more advanced signals and policies without changing the fundamental separation between:

```text
evidence orchestration
        and
financial-risk calculation
```

---

# 28. Final Architecture Summary

SendGuard combines financial context with telecom network intelligence through an Agent-based orchestration layer.

The final architecture is:

```text
                 Financial Context
                        │
                        ▼
                     FastAPI
                        │
                        ▼
              Pydantic AI Agent
                        │
                 Gemini / Groq
                        │
                        ▼
                 Agent Tool Calls
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       SIM Swap     Device Swap    Location
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                CAMARA Tool Layer
                        │
                 Demo / Live
                        │
                        ▼
                Network Evidence
                        │
                        ▼
               Deterministic Trust
                   Engine
                        │
                        ▼
                  Trust Index
                        │
                        ▼
                   Risk Tier
                        │
                        ▼
              Recommendation Layer
                        │
                 Allowed Action
                        │
                        ▼
                     Action
                        │
                        ▼
                  Bank / Fintech
```

The core principle is:

> **Pydantic AI determines what evidence should be collected.**

> **CAMARA provides the network evidence.**

> **Python policy guardrails control what the Agent is allowed to execute.**

> **The deterministic Trust Engine determines how the evidence affects transaction trust.**

> **The Recommendation Layer selects only an action allowed for the resulting risk tier.**

This separation allows SendGuard to combine agentic AI, telecom network intelligence, and deterministic financial-risk controls in a single explainable architecture.
