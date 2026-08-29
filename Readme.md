# 🛡️ SendGuard
### AI-Powered Trust Orchestration Layer for Digital Financial Transactions

**GSMA MENA Ignite Hackathon 2026 — Finals**
**Theme:** Secure Fintech, Payments & Anti-Fraud Innovation

> "The bank has the transaction data. The telecom has the network data. SendGuard is the first layer that fuses both into one real-time trust decision."

---

## The Problem

Digital wallets and instant payment platforms (Instapay, Vodafone Cash, Orange Cash, mobile banking apps) have become the backbone of daily financial transactions across Egypt and the MENA region. Egyptian expatriate remittances alone reached **$41.5B in 2025**.

This growth has been matched by a surge in social-engineering fraud. In mid-2026, scam calls impersonating Instapay customer service tricked victims into "verifying" their accounts, with documented losses of up to **80,000 EGP per victim in a single call**.

Traditional defenses fail because they only see what's inside the app:
- **OTP codes** — the fraudster convinces the victim to reveal it, not hack it
- **Caller ID** — trivially spoofed
- **Awareness campaigns** — don't reach everyone, forgotten under pressure
- **Bank fraud systems** — only see transaction data (amount, time), blind to whether the SIM changed today or the device is really the user's

## The Solution

**SendGuard is not a competing app — it's a security layer** that sits on top of any existing financial platform. It uses **GSMA Open Gateway CAMARA APIs** to give financial platforms access to something they've never had: real-time telecom network intelligence.

An **AI Agent** orchestrates signals from the network (Number Verification, SIM Swap, Device Swap/Status, Location Verification, Quality on Demand) and combines them with transaction context to calculate a **Trust Index (0–100)** — before a transaction completes, not after.

```
Bank / Wallet App
       │
       ▼
  SendGuard Layer
       │
       ▼
   AI Agent  ──►  Observe → Reason → Act → Explain
       │
       ├──► Number Verification
       ├──► SIM Swap
       ├──► Device Swap / Status
       ├──► Location Verification
       └──► Quality on Demand (for Video KYC)
       │
       ▼
   Trust Index (0–100)
       │
       ▼
Allow │ Adaptive Verification │ Transaction Hold │ Temporary Freeze
```

### Why It's Different

- **Context-aware, not rule-based.** A single risky signal (e.g., a recent SIM swap) never triggers a block on its own — it's weighed alongside device, location, and transaction context to avoid punishing legitimate customers (false positives).
- **Confidence Recovery, not permanent judgment.** If a flagged user passes additional verification, trust is restored and the transaction completes — SendGuard manages trust, it doesn't label people "fraudster" or "innocent."
- **Explainable by design.** Every decision comes with a reasons list, not just a number.
- **Platform-agnostic.** Works with any digital financial app — wallets, banks, government services — not tied to a single provider.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python (FastAPI) |
| AI Agent | Python — orchestration + reasoning layer |
| Frontend | React (JS) |
| Database | SQLite (prototype) |
| Network APIs | GSMA CAMARA APIs via Nokia Network-as-Code |

## Project Structure

See [`BACKLOG.md`](./BACKLOG.md) for the full repository structure, phase-by-phase execution plan, and task breakdown.

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your CAMARA API credentials
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open the app and use the **Scenario Selector** to run one of the demo scenarios (see [`docs/demo_scenarios.md`](./docs/demo_scenarios.md)):

1. **Legitimate transaction** — all signals normal → instant allow
2. **False Positive** — SIM swapped today, new device, travel abroad, but verification passes → adaptive verification → confidence recovery → allow
3. **Suspicious / Medium risk** — recent SIM swap, unknown device, high amount → step-up verification
4. **High risk** — multiple strong negative signals, verification fails → temporary freeze

## Business Model

**B2B SaaS.** Customers are wallet providers, banks, and government financial services — not the end user. Pricing via subscription or pay-per-verification. The cost is negligible compared to the fraud losses, legal liability, and customer trust damage these institutions currently absorb.

## Privacy & Consent

CAMARA APIs are consent-based by design — network operators share signals only with explicit user consent. SendGuard never accesses call or message content, only limited technical signals (SIM status, device status, number match, location range).

## Known Limitations

- The current Trust Index weights are **Initial Heuristic Weights**, based on risk-analysis logic — not a trained model. Future work: Dynamic Weight Adjustment based on real fraud outcome data.
- Not a 100% fraud prevention guarantee — it adds an independent layer of network intelligence to reduce risk, alongside existing defenses.

## Team

| Name | Role |
|---|---|
| | Backend / AI Agent |
| | Frontend / Dashboard |
| | CAMARA Integration |
| | Pitch / Demo |

## Documentation

- [`BACKLOG.md`](./BACKLOG.md) — full execution plan and task backlog
- [`docs/architecture.md`](./docs/architecture.md) — technical architecture details
- [`docs/demo_scenarios.md`](./docs/demo_scenarios.md) — scripted demo scenarios
- [`docs/decisions_log.md`](./docs/decisions_log.md) — key technical decisions and rationale

---

*Built for the GSMA MENA Ignite Hackathon — powered by CAMARA APIs and the Nokia Network-as-Code platform.*