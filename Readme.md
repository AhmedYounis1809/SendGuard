# 🛡️ SendGuard

## AI-Powered Trust Orchestration Layer for Digital Financial Transactions

**GSMA MENA Ignite Hackathon 2026 — Finals**
**Theme:** Secure Fintech, Payments & Anti-Fraud Innovation

> **The bank has the transaction data. The telecom operator has the network data. SendGuard brings both together into one real-time trust decision.**

---

# The Problem

Digital wallets and instant-payment platforms such as **InstaPay, Vodafone Cash, Orange Cash, mobile banking applications, and other fintech services** are becoming an increasingly important part of everyday financial activity across Egypt and the wider MENA region.

The scale of digital financial activity is significant. Remittances from Egyptians working abroad reached a record **$41.5 billion in 2025**, according to the Central Bank of Egypt.

As digital financial activity grows, fraudsters increasingly exploit the **human and operational layer** around authentication instead of directly breaking the underlying financial system.

A common pattern is social engineering:

```text
Fraudster
   ↓
Impersonates a trusted service
   ↓
Creates urgency / confusion
   ↓
Convinces the customer to authenticate or reveal information
   ↓
Initiates or facilitates a fraudulent transaction
```

This creates a fundamental problem for traditional transaction-risk systems:

> **The bank can see what the customer is doing inside the financial system, but it may not have visibility into what is happening on the telecom network at that exact moment.**

For example, a bank may know:

```text
Transaction:
EGP 50,000

Beneficiary:
New

Recent transactions:
2 in 10 minutes

Device:
Untrusted
```

But it may not independently know:

```text
Was the SIM changed 1 hour ago?

Did this phone number recently move to another physical device?

Is the device currently inside the user's expected location?
```

That missing network context can make fraud decisions less accurate.

---

## Why Existing Signals Are Not Enough

### OTP Codes

OTP-based authentication proves that a code was entered successfully.

It does not necessarily prove that the person who entered the code is acting safely.

A fraudster may socially engineer the legitimate user into revealing or approving the authentication step.

### Caller ID

Caller ID is not a strong trust signal by itself because the displayed caller identity can be manipulated.

### Awareness Campaigns

User education remains important, but awareness cannot eliminate every social-engineering attack, particularly when attackers create urgency and pressure.

### Traditional Transaction Fraud Systems

Financial institutions already analyze valuable transaction signals such as:

* amount
* time
* beneficiary
* transaction frequency
* account history
* device information

But transaction context alone can miss important telecom events.

For example:

```text
Normal-looking transaction
        +
SIM changed today
        +
Number moved to a new device
```

can represent a very different risk situation from:

```text
Normal-looking transaction
        +
Known SIM
        +
Known device
        +
Expected location
```

The financial transaction itself may look similar.

The **network context is not**.

---

# The Gap

The problem is not that banks lack data.

The problem is that the relevant data is distributed across different systems.

```text
                 Financial Institution
                        │
                        │
              Transaction Context
                        │
                        ▼
             ┌────────────────────┐
             │                    │
             │  Amount            │
             │  Beneficiary       │
             │  Velocity          │
             │  Account Context   │
             │                    │
             └────────────────────┘


                 Telecom Operator
                        │
                        │
                  Network Context
                        │
                        ▼
             ┌────────────────────┐
             │                    │
             │  SIM changes       │
             │  Device changes    │
             │  Location          │
             │                    │
             └────────────────────┘
```

These two views describe the same user and the same transaction from different perspectives.

**SendGuard connects them.**

---

# The Solution

**SendGuard is not a replacement for a bank, wallet, or payment application.**

It is a **security and trust orchestration layer** that sits between the financial platform and network intelligence.

The financial platform sends the transaction context it already owns.

The SendGuard AI Agent analyzes that context and determines which telecom evidence is relevant.

The Agent then orchestrates the available CAMARA tools.

The collected network evidence is combined with the financial context inside a deterministic Trust Engine.

The result is a **Trust Index from 0 to 100** and an explainable action.

```text
Bank / Fintech
      │
      │ Transaction Context
      ▼
SendGuard API
      │
      ▼
AI Agent
      │
      │ decides what network evidence is needed
      ▼
CAMARA Tool Layer
      │
      ├── SIM Swap
      ├── Device Swap
      └── Location Verification
      │
      ▼
Network Evidence
      │
      ▼
Deterministic Trust Engine
      │
      ▼
Trust Index (0–100)
      │
      ▼
Risk Tier
      │
      ▼
Recommended Action
      │
      ▼
Bank / Fintech
```

---

# What Makes SendGuard Different?

## 1. Context-Aware, Not Single-Signal Blocking

SendGuard does not use simplistic rules such as:

```text
SIM Swap = Fraud
```

or:

```text
New Device = Fraud
```

Instead, it combines multiple pieces of evidence.

```text
Bank Context
      +
SIM State
      +
Device State
      +
Location
      ↓
Trust Assessment
```

A recent SIM change reduces confidence.

It does not automatically mean that the customer is fraudulent.

---

# 2. False-Positive Protection

Legitimate customers can:

* change their SIM
* buy a new phone
* travel
* use a different device
* perform unusual transactions

A security system that immediately blocks every unusual event creates unnecessary friction.

SendGuard therefore uses an adaptive approach:

```text
Unusual Signal
      ↓
Trust decreases
      ↓
Gather additional evidence
      ↓
Adaptive Verification
      ↓
Verification succeeds
      ↓
Confidence Recovery
      ↓
Transaction can continue
```

The system manages **transaction trust**, not a permanent label such as "fraudster" or "safe customer."

Scenario 3 in the demo demonstrates this principle directly: a known beneficiary combined with a newly changed device produces **Adaptive Verification**, not an immediate freeze.

---

# 3. AI-Powered Evidence Orchestration

The AI Agent is not a chatbot sitting on top of the system.

It actively orchestrates the investigation.

For example:

```text
50,000 EGP
+
New beneficiary
+
Untrusted device

        ↓

Agent analyzes context

        ↓

Check SIM Swap
Check Device Swap
Check Location if a valid reference exists

        ↓

Evaluate collected evidence
```

The Agent decides **which evidence to request**.

The Trust Engine decides **how that evidence affects the Trust Index**.

This keeps reasoning and financial risk arithmetic separate.

---

# 4. Deterministic Financial Risk Calculation

The LLM does not invent the final Trust Index.

The Trust Engine is deterministic:

```text
Same inputs
     ↓
Same evidence
     ↓
Same Trust Index
     ↓
Same risk tier
```

This makes the core financial-risk calculation:

* reproducible
* explainable
* testable
* auditable

The current weights are **initial prototype heuristics**, not statistically validated fraud probabilities.

---

# 5. Explainable Decisions

SendGuard does not return only:

```text
Risk = 87%
```

It returns the reasons behind the decision.

Example:

```text
Trust Index: 73/100

Reasons:
+ No recent SIM change
- New device detected 2h ago
+ Location within expected area
+ Familiar beneficiary

Risk Tier:
ADAPTIVE_VERIFICATION

Recommended Action:
TRANSACTION_CONFIRMATION
```

The financial institution can therefore understand:

> **Why did SendGuard make this decision?**

---

# 6. Adaptive Actions Instead of One Hard Block

SendGuard supports four risk tiers:

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

The objective is to match the security response to the strength of the evidence.

A low-risk transaction should not be slowed down unnecessarily.

A suspicious transaction should receive additional verification.

A highly suspicious transaction can be held.

Only the strongest combinations should reach temporary freeze.

---

# How SendGuard Works

SendGuard combines two fundamentally different types of information.

## Bank / Financial Context

Provided by the financial institution:

```json
{
  "amount": 50000,
  "currency": "EGP",
  "is_new_beneficiary": true,
  "recent_transaction_count_10min": 2,
  "trusted_device_available": false,
  "location_reference_available": false
}
```

Examples:

* transaction amount
* beneficiary history
* transaction velocity
* device context
* whether a location reference is available

---

## Telecom / Network Evidence

Gathered through the CAMARA tool layer:

```json
{
  "swapped_recently": true,
  "hours_since_swap": 1
}
```

Examples:

* SIM Swap
* Device Swap
* Location Verification

The value of SendGuard comes from combining both:

```text
Financial Context
        +
Telecom Network Evidence
        ↓
AI-Orchestrated Investigation
        ↓
Deterministic Trust Engine
        ↓
Adaptive Security Decision
```

---

# Current CAMARA Integrations

The current prototype integrates:

## SIM Swap

Detects whether the SIM associated with the mobile number changed recently.

A recent change is treated as a risk signal rather than automatic proof of fraud.

## Device Swap

Detects whether the mobile number recently became associated with another device.

A recent device change can become significant when combined with transaction anomalies.

## Location Verification

Verifies whether the device is inside an expected geographic area.

Location is only checked when the financial context provides a usable reference.

No location reference means:

```text
Less available evidence
```

not:

```text
Fraud
```

---

# Demo Mode vs Live Mode

The prototype supports the same tool architecture in both live and demo execution.

## Live

```text
Agent
  ↓
CAMARA Tool
  ↓
Nokia Network-as-Code
  ↓
CAMARA API
  ↓
Network Evidence
```

## Demo

The Nokia sandbox provides a limited test identity. That identity is useful for integration testing but cannot represent six different network states at the same time.

For the scripted hackathon demo, SendGuard therefore uses **scenario-controlled network responses**:

```text
Agent
  ↓
CAMARA Tool
  ↓
Demo Signal Provider
  ↓
Scenario-Specific Network Evidence
```

The Agent still genuinely chooses and orchestrates the tools.

Only the response source changes.

The final Trust Index, risk tier, and action are still produced by the normal SendGuard pipeline.

---

# Six Demo Scenarios

The demo demonstrates a progression from normal trusted activity to strong multi-signal risk.

| Scenario                      |  Trust | Risk Tier             | Action                         |
| ----------------------------- | -----: | --------------------- | ------------------------------ |
| Everyday Transfer             | ~95–98 | ALLOW                 | ALLOW                          |
| Family Support                | ~95–98 | ALLOW                 | ALLOW                          |
| New Device, Known Recipient   |     73 | ADAPTIVE_VERIFICATION | TRANSACTION_CONFIRMATION       |
| New Beneficiary, Large Amount |     25 | TRANSACTION_HOLD      | TEMPORARY_SAFETY_HOLD*         |
| Rapid Back-to-Back Transfers  |     30 | TRANSACTION_HOLD      | TEMPORARY_SAFETY_HOLD          |
| High-Value, No Reference      |     17 | TEMPORARY_FREEZE      | TEMPORARY_FREEZE_MANUAL_REVIEW |

* `TRANSACTION_HOLD` can also allow `OUT_OF_BAND_VERIFICATION`; the current deterministic fallback prefers `TEMPORARY_SAFETY_HOLD`.

See [`docs/demo_scenarios.md`](./docs/demo_scenarios.md) for the complete scenarios, signals, calculations, Agent behavior, and expected outputs.

---

# Example: High-Risk Transaction

Consider:

```text
Transaction:
EGP 50,000

Beneficiary:
New

Recent transactions:
2 in 10 minutes

Location reference:
Unavailable

Network:
SIM changed 1h ago
Device changed 1.5h ago
```

The Agent gathers the relevant network evidence.

The Trust Engine then calculates:

```text
Base Trust                  90
Recent SIM change           -25
Recent device change        -25
New beneficiary             -10
Large transaction             -8
No location reference        -5
────────────────────────────────
Trust Index                  17
```

The final result becomes:

```text
Trust Index:
17 / 100

Risk Tier:
TEMPORARY_FREEZE

Action:
TEMPORARY_FREEZE_MANUAL_REVIEW
```

This is not because one signal said "fraud."

It is because **multiple independent financial and network signals compound into a low-confidence transaction state.**

---

# Reliability Architecture

SendGuard uses a three-tier fallback strategy for investigation and recommendation.

## Investigation

```text
Gemini
  ↓ failure
Groq
  ↓ failure
Deterministic fallback
```

Gemini and Groq can perform multi-step tool orchestration.

The deterministic fallback ensures that the system can still collect the predefined available evidence when no LLM provider is available.

## Recommendation

```text
Gemini
  ↓ failure
Groq
  ↓ failure
Deterministic action selection
```

The Trust Engine remains deterministic regardless of the provider used for evidence orchestration.

---

# Python Policy Guardrails

The Agent does not have unrestricted authority.

Python-side policy validation is applied before tool execution.

Example:

```text
Agent requests Location Verification
              ↓
Python Policy Guard
              ↓
Is a location reference available?
        ┌─────┴─────┐
       YES           NO
        │             │
    Execute          Reject
```

Other safeguards include:

* preventing duplicate successful tool calls
* restricting actions to the current risk tier
* validating allowed actions
* treating failed signals as unknown rather than safe
* applying a degraded-evidence score ceiling

---

# Trust Engine

The Trust Engine lives in:

```text
backend/app/agent/trust_engine.py
```

It takes:

```text
Bank Context
+
Collected Network Evidence
```

and returns:

```text
Trust Index
Risk Tier
Contributions
Reasons
Degraded Signals
Uncalled Signals
```

The current model starts from:

```text
BASE TRUST = 90
```

and applies configurable prototype heuristics for:

* SIM changes
* device changes
* location verification
* beneficiary history
* transaction velocity
* transaction amount
* missing location reference

These weights are explicitly treated as **initial prototype heuristics**, not trained fraud probabilities.

Future production calibration would use real fraud outcomes, false-positive rates, customer behavior, and financial-institution-specific policies.

---

# Privacy and Consent

SendGuard is designed to work with technical network signals rather than communication content.

The prototype does not inspect:

* phone-call content
* SMS content
* private conversations

A production deployment would require the appropriate authorization, consent, privacy, data-minimization, retention, and regulatory controls for the relevant operator, country, and financial-service environment.

---

# Business Model

SendGuard is designed as a **B2B security platform**.

Potential customers include:

* banks
* digital wallets
* fintech providers
* payment platforms
* digital financial services

Potential commercial models include:

```text
Subscription
+
Pay-per-verification
+
Enterprise API licensing
```

The financial institution remains responsible for the final transaction-control policy.

SendGuard provides an additional layer of network intelligence, evidence orchestration, and explainable trust assessment.

---

# Tech Stack

| Layer                        | Technology                                         |
| ---------------------------- | -------------------------------------------------- |
| Backend                      | Python + FastAPI                                   |
| AI Agent                     | Gemini + Groq fallback + deterministic fallback    |
| Agent Orchestration          | Python tool/function calling                       |
| Trust Engine                 | Deterministic Python scoring                       |
| Frontend                     | React + TypeScript                                 |
| Network APIs                 | GSMA Open Gateway CAMARA via Nokia Network-as-Code |
| Current Network Integrations | SIM Swap, Device Swap, Location Verification       |
| Demo Signal Layer            | Scenario-controlled network signal simulation      |
| Database                     | None in the current prototype                      |

---

# Project Structure

```text
SendGuard/
│
├── backend/
│   └── app/
│       ├── agent/
│       │   ├── actions.py
│       │   ├── agent.py
│       │   ├── demo_mode.py
│       │   ├── demo_scenarios.py
│       │   ├── llm_client.py
│       │   ├── orchestrator.py
│       │   ├── recommendation.py
│       │   └── trust_engine.py
│       │
│       ├── api/
│       │
│       ├── camara/
│       │   ├── client.py
│       │   ├── device_swap.py
│       │   ├── location_verification.py
│       │   └── sim_swap.py
│       │
│       ├── models/
│       └── main.py
│
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── core/
│       │   ├── config/
│       │   ├── i18n/
│       │   ├── network/
│       │   └── theme/
│       │
│       └── features/
│           ├── camara-verification/
│           ├── navigation/
│           ├── settings/
│           └── trust-dashboard/
│               ├── api/
│               ├── components/
│               ├── data/
│               ├── hooks/
│               └── types/
│
├── docs/
│   ├── architecture.md
│   └── demo_scenarios.md
│
└── README.md
```

---

# Getting Started

## Backend

```bash
cd backend

pip install -r requirements.txt

cp .env.example .env
```

Configure the required LLM credentials.

For live CAMARA execution, configure the required Nokia Network-as-Code credentials.

Run:

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Health check:

```text
GET /health
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Open the frontend and use the Trust Dashboard to select one of the six predefined demo scenarios.

---

# API Endpoints

## Health

```text
GET /health
```

## Live Agent

```text
POST /api/agent/run
```

## CAMARA Verification

```text
POST /api/camara/verify
```

## Demo Scenario

```text
POST /api/scenarios/{scenario_id}/run
```

Available scenario IDs:

```text
everyday_transfer
family_support
new_device
new_beneficiary_large
rapid_transfers
high_value_no_reference
```

---

# Demo Request Flow

A predefined scenario follows this pipeline:

```text
1. User selects a scenario
          ↓
2. Frontend sends transaction context
          ↓
3. FastAPI receives scenario_id
          ↓
4. Backend activates scenario-specific network signals
          ↓
5. AI Agent analyzes the transaction
          ↓
6. Agent selects relevant telecom tools
          ↓
7. Python policy guardrails validate tool calls
          ↓
8. Demo tools return scenario-controlled network evidence
          ↓
9. Agent decides whether additional evidence is needed
          ↓
10. Trust Engine calculates Trust Index
          ↓
11. Risk tier is determined
          ↓
12. Recommendation layer selects an allowed action
          ↓
13. Action layer executes / represents the result
          ↓
14. Backend returns explainable decision
          ↓
15. Frontend renders the decision
```

---

# Known Limitations

### Initial Heuristic Weights

The current Trust Index is a prototype heuristic model and is not a trained statistical fraud model.

### Limited Sandbox Identity

The Nokia sandbox provides a limited test identity. Scenario-controlled network responses are therefore used to demonstrate multiple network states reproducibly during the hackathon demo.

### Production CAMARA Availability

Actual CAMARA API availability, operator support, authorization, consent, quotas, and production deployment requirements depend on the target operator and deployment environment.

### No Fraud Guarantee

SendGuard is an additional network-intelligence and transaction-trust layer. It does not guarantee prevention of every fraudulent transaction.

### Production Calibration

Production deployment would require calibration against real fraud outcomes and false-positive data.

---

# Documentation

* [`docs/architecture.md`](./docs/architecture.md) — detailed technical architecture, component responsibilities, Agent orchestration, CAMARA tool layer, Trust Engine, fallbacks, and request flow
* [`docs/demo_scenarios.md`](./docs/demo_scenarios.md) — six demo scenarios, network evidence, Trust calculations, and expected behavior


---

# Hackathon

**GSMA MENA Ignite Hackathon 2026 — Finals**
**Theme:** Secure Fintech, Payments & Anti-Fraud Innovation

SendGuard demonstrates how financial transaction context and telecom network intelligence can be combined through AI-agent orchestration to produce an adaptive and explainable trust decision before a digital transaction is completed.

> **SendGuard does not simply ask: "Is this transaction risky?"**
>
> **It asks: "What evidence do we need before we trust this transaction?"**

---

*Built for the GSMA MENA Ignite Hackathon 2026 using GSMA Open Gateway CAMARA APIs and the Nokia Network-as-Code platform.*
