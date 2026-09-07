# SendGuard — Demo Scenarios

## Purpose

The SendGuard demo uses six predefined transaction scenarios to demonstrate how the system moves from normal trusted behavior to increasingly suspicious combinations of financial and network signals.

The scenarios are not six hardcoded final decisions.

Each scenario defines:

1. transaction context from the financial side
2. expected network evidence for the telecom side
3. the evidence the AI Agent is expected to investigate
4. the resulting Trust Index
5. the corresponding risk tier
6. the recommended action
7. the security behavior the scenario demonstrates

The final score is calculated by the real deterministic Trust Engine.

---

# Demo Architecture

```text
Frontend Scenario
       │
       │ Bank-side transaction context
       ▼
FastAPI
       │
       │ Scenario-specific network evidence
       ▼
Demo Signal Layer
       │
       ▼
AI Agent
       │
       │ chooses relevant tools
       ▼
CAMARA Tool Layer
       │
       ├── SIM Swap
       ├── Device Swap
       └── Location Verification
       │
       ▼
Collected Evidence
       │
       ▼
Trust Engine
       │
       ▼
Trust Index
       │
       ▼
Risk Tier
       │
       ▼
Recommended Action
```

---

# Scenario 1 — Everyday Transfer

## User story

A customer makes a normal everyday payment to a familiar beneficiary from a trusted device.

### Transaction

```text
Amount: 500 EGP
Beneficiary: Existing
Recent transactions: 1 in 10 minutes
Location: Cairo
Device: Trusted
```

### Bank context

```json
{
  "amount": 500,
  "is_new_beneficiary": false,
  "recent_transaction_count_10min": 1,
  "location_reference_available": true,
  "trusted_device_available": true
}
```

### Network evidence

```text
SIM Swap:
No recent change

Device Swap:
Known device

Location:
TRUE
```

### Expected Agent behavior

The transaction is low complexity and low risk.

The Agent may perform the available relevant checks and stop once sufficient evidence has been collected.

Expected investigation display:

```text
SIM Swap
Device Swap
Location Verification
```

### Trust calculation

```text
Base Trust                  90
Familiar beneficiary         +5
Location verified            +3
──────────────────────────────
Trust Index                  98
```

Depending on the exact displayed demo context, the UI may show the score in the mid/high 90s; the important result is the same:

```text
Tier: ALLOW
Action: ALLOW
```

### What this scenario demonstrates

* normal trusted behavior
* no unnecessary friction
* positive use of familiar transaction context
* expected location
* trusted device

---

# Scenario 2 — Family Support

## User story

A customer sends money to a long-saved family member as part of recurring behavior.

### Transaction

```text
Amount: 1,200 EGP
Beneficiary: Existing / recurring
Recent transactions: 0 in 10 minutes
Location: Cairo
Device: Trusted
```

### Bank context

```json
{
  "amount": 1200,
  "is_new_beneficiary": false,
  "recent_transaction_count_10min": 0,
  "location_reference_available": true,
  "trusted_device_available": true
}
```

### Network evidence

```text
SIM Swap:
No recent change

Device Swap:
Known device

Location:
TRUE
```

### Trust calculation

```text
Base Trust                  90
Familiar beneficiary         +5
Location verified            +3
──────────────────────────────
Trust Index                  98
```

Expected result:

```text
Tier: ALLOW
Action: ALLOW
```

### What this scenario demonstrates

This case is intentionally similar to Scenario 1.

The difference is behavioral context:

> Familiar recurring behavior is treated as evidence of trust.

It shows that SendGuard does not treat every transfer as an isolated event.

---

# Scenario 3 — New Device, Known Recipient

## User story

The recipient is trusted, but the sender is using an unfamiliar device.

This is an important false-positive protection scenario.

### Transaction

```text
Amount: 3,000 EGP
Beneficiary: Existing
Recent transactions: 1 in 10 minutes
Location: Cairo
Device: Untrusted
```

### Bank context

```json
{
  "amount": 3000,
  "is_new_beneficiary": false,
  "recent_transaction_count_10min": 1,
  "location_reference_available": true,
  "trusted_device_available": false
}
```

### Network evidence

```text
SIM Swap:
No recent change

Device Swap:
Changed 2 hours ago

Location:
TRUE
```

### Expected Agent investigation

```text
[1] SIM Swap
[2] Device Swap
[3] Location Verification
```

### Trust calculation

```text
Base Trust                  90
No recent SIM change         +0
New device                   -25
Location verified             +3
Familiar beneficiary          +5
──────────────────────────────
Trust Index                  73
```

### Expected decision

```text
Trust Index: 73
Tier: ADAPTIVE_VERIFICATION
Action: TRANSACTION_CONFIRMATION
```

### Why this scenario matters

This demonstrates the core false-positive principle:

```text
New device
    ≠
Confirmed fraud
```

Instead:

```text
New device
   ↓
Lower confidence
   ↓
Step-up verification
```

A legitimate customer can change devices without being blocked.

---

# Scenario 4 — New Beneficiary, Large Amount

## User story

A customer attempts a 25,000 EGP transfer to a first-time beneficiary while both SIM and device signals indicate recent changes.

### Transaction

```text
Amount: 25,000 EGP
Beneficiary: New
Recent transactions: 1 in 10 minutes
Location: Cairo
Device: Untrusted
```

### Bank context

```json
{
  "amount": 25000,
  "is_new_beneficiary": true,
  "recent_transaction_count_10min": 1,
  "location_reference_available": true,
  "trusted_device_available": false
}
```

### Network evidence

```text
SIM Swap:
Changed 8 hours ago

Device Swap:
Changed 3 hours ago

Location:
TRUE
```

### Expected Agent investigation

```text
[1] SIM Swap
[2] Device Swap
[3] Location Verification
```

### Trust calculation

```text
Base Trust                  90
SIM change                   -25
Device change                -25
Location verified             +3
New beneficiary              -10
Large transaction             -8
──────────────────────────────
Trust Index                  25
```

### Expected decision

```text
Trust Index: 25
Tier: TRANSACTION_HOLD
```

Possible recommended actions are:

```text
TEMPORARY_SAFETY_HOLD
OUT_OF_BAND_VERIFICATION
```

The current deterministic recommendation fallback selects:

```text
TEMPORARY_SAFETY_HOLD
```

The LLM recommendation layer may choose an allowed alternative such as `OUT_OF_BAND_VERIFICATION`, provided it remains inside the tier's allowed action set.

### What this scenario demonstrates

Multiple independent anomalies compound:

```text
New beneficiary
+
Large amount
+
Recent SIM change
+
Recent device change
```

The system moves beyond a simple step-up case and places the transaction on hold.

---

# Scenario 5 — Rapid Back-to-Back Transfers

## User story

The customer sends money repeatedly within a short period to a new beneficiary while the number recently moved to another device.

### Transaction

```text
Amount: 8,000 EGP
Beneficiary: New
Recent transactions: 4 in 10 minutes
Location: No reference
Device: Untrusted
```

### Bank context

```json
{
  "amount": 8000,
  "is_new_beneficiary": true,
  "recent_transaction_count_10min": 4,
  "location_reference_available": false,
  "trusted_device_available": false
}
```

### Network evidence

```text
SIM Swap:
No recent change

Device Swap:
Changed 5 hours ago

Location:
Not called
```

Location is intentionally not called because the transaction has no usable location reference.

### Expected Agent investigation

```text
[1] SIM Swap
[2] Device Swap
Location Verification — skipped
```

### Trust calculation

```text
Base Trust                  90
No recent SIM change         +0
New device                   -25
New beneficiary              -10
No location reference         -5
4 transactions / 10 min     -20
──────────────────────────────
Trust Index                  30
```

### Expected decision

```text
Trust Index: 30
Tier: TRANSACTION_HOLD
Action: TEMPORARY_SAFETY_HOLD
```

### What this scenario demonstrates

This case shows that **velocity itself is a security signal**.

The transaction is suspicious even though:

```text
SIM Swap = normal
```

because several other signals combine:

```text
New beneficiary
+
Rapid transaction burst
+
New device
+
No location reference
```

---

# Scenario 6 — High-Value, No Reference

## User story

A large 50,000 EGP transaction is sent to a new beneficiary while both SIM and device changes are extremely recent and there is no location reference.

This is the strongest scenario in the demo.

### Transaction

```text
Amount: 50,000 EGP
Beneficiary: New
Recent transactions: 2 in 10 minutes
Location: No reference
Device: Untrusted
```

### Bank context

```json
{
  "amount": 50000,
  "is_new_beneficiary": true,
  "recent_transaction_count_10min": 2,
  "location_reference_available": false,
  "trusted_device_available": false
}
```

### Network evidence

```text
SIM Swap:
Changed 1 hour ago

Device Swap:
Changed 1.5 hours ago

Location:
Not called
```

### Expected Agent investigation

```text
[1] SIM Swap
[2] Device Swap
Location Verification — skipped
```

### Trust calculation

```text
Base Trust                  90
SIM change                   -25
Device change                -25
New beneficiary              -10
Large transaction             -8
No location reference         -5
──────────────────────────────
Trust Index                  17
```

### Expected decision

```text
Trust Index: 17
Tier: TEMPORARY_FREEZE
Action: TEMPORARY_FREEZE_MANUAL_REVIEW
```

### What this scenario demonstrates

The strongest intervention appears only when several independent signals compound:

```text
High-value transaction
+
New beneficiary
+
Recent SIM change
+
Recent device change
+
No location reference
```

The scenario demonstrates why SendGuard is a **multi-signal trust layer**, rather than a single-rule fraud blocker.

---

# 7. Scenario Comparison

The six scenarios create a progression:

```text
┌────────────────────────────────────────────┐
│ 1. Everyday Transfer                       │
│    Normal behavior                         │
│    ↓                                       │
│ 2. Family Support                          │
│    Recurring trusted behavior              │
│    ↓                                       │
│ 3. New Device                              │
│    Single significant anomaly              │
│    ↓                                       │
│ 4. New Beneficiary + Large Amount          │
│    Multiple strong anomalies               │
│    ↓                                       │
│ 5. Rapid Transfer Burst                    │
│    Velocity + device + beneficiary risk    │
│    ↓                                       │
│ 6. High Value + No Reference               │
│    Strongest combined evidence             │
└────────────────────────────────────────────┘
```

Expected Trust spectrum:

```text
Scenario 1    ~95–98   ALLOW
Scenario 2    ~95–98   ALLOW
Scenario 3      73     ADAPTIVE_VERIFICATION
Scenario 4      25     TRANSACTION_HOLD
Scenario 5      30     TRANSACTION_HOLD
Scenario 6      17     TEMPORARY_FREEZE
```

---

# 8. False-Positive Demonstration

The six scenarios already demonstrate the false-positive philosophy without requiring a separate seventh scenario.

Scenario 3 is the clearest example:

```text
Known beneficiary
+
Normal SIM
+
Normal location
+
New device
```

The system does **not** jump directly to:

```text
FREEZE
```

Instead:

```text
Trust decreases
     ↓
Adaptive Verification
     ↓
User proves identity / intent
     ↓
Confidence Recovery
     ↓
Transaction can continue
```

This same design principle also applies to legitimate users who change SIMs or travel.

---

# 9. Demo Principles

The six scenarios are intentionally designed around several principles.

## One signal is not enough

A single anomaly should normally reduce trust rather than automatically prove fraud.

## Context matters

The same network signal can have different significance depending on:

* transaction amount
* beneficiary history
* transaction velocity
* available location reference
* other network evidence

## Missing evidence is not automatically bad evidence

No location reference means:

```text
Less evidence
```

not:

```text
Fraud
```

## Multiple independent signals matter more

Recent SIM change plus recent device change is stronger than either signal alone.

## Strong intervention should be rare

Temporary freeze is reserved for the strongest combination of evidence.

---

# 10. Demo Scenario IDs

The backend scenario IDs are:

```text
everyday_transfer
family_support
new_device
new_beneficiary_large
rapid_transfers
high_value_no_reference
```

They are shared with the frontend scenario definitions.

A demo request is sent to:

```text
POST /api/scenarios/{scenario_id}/run
```

---

# 11. What the Judge Should See

Each scenario should make the following flow visible:

```text
Transaction received
        ↓
Agent gathering evidence
        ↓
Tool calls
        ↓
Returned network signals
        ↓
Trust Index
        ↓
Risk Tier
        ↓
Recommended Action
        ↓
Deterministic reasons
```

The most important part is not the number itself.

The important part is showing:

> **Why did the system need this evidence, what did the network say, and how did that evidence change the transaction decision?**

---

# 12. Expected Demo Outcomes

| Scenario                      |  Trust | Tier                  | Expected action                |
| ----------------------------- | -----: | --------------------- | ------------------------------ |
| Everyday Transfer             | ~95–98 | ALLOW                 | ALLOW                          |
| Family Support                | ~95–98 | ALLOW                 | ALLOW                          |
| New Device, Known Recipient   |     73 | ADAPTIVE_VERIFICATION | TRANSACTION_CONFIRMATION       |
| New Beneficiary, Large Amount |     25 | TRANSACTION_HOLD      | TEMPORARY_SAFETY_HOLD*         |
| Rapid Back-to-Back Transfers  |     30 | TRANSACTION_HOLD      | TEMPORARY_SAFETY_HOLD          |
| High-Value, No Reference      |     17 | TEMPORARY_FREEZE      | TEMPORARY_FREEZE_MANUAL_REVIEW |

* `TRANSACTION_HOLD` allows both `TEMPORARY_SAFETY_HOLD` and `OUT_OF_BAND_VERIFICATION`; the deterministic fallback currently prefers `TEMPORARY_SAFETY_HOLD`.
