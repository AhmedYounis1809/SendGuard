import type { ScenarioId, TransactionResult, VerificationResult } from "../types/trust-dashboard.types";

/**
 * Mock-only for now. `POST /transaction` and `POST /transaction/{id}/verify`
 * land in Phase D (see BACKLOG.md) once the Trust Engine exists — this file
 * is the single place that changes when that lands, per the contract in
 * BACKLOG.md Section 9.5.
 */

const SCENARIO_DELAY_MS = 800;
const VERIFY_DELAY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_RESULTS: Record<ScenarioId, TransactionResult> = {
  legitimate: {
    transaction_id: "txn_mock_legitimate",
    trust_index: 95,
    decision: "ALLOW",
    signals: {
      number_verification: { verified: true },
      sim_swap: { swapped_recently: false, weight: 0 },
      device_swap: { swapped_recently: false, weight: 0 },
      location_verification: { verified: true, verification_result: "TRUE" },
    },
    reasons: [
      { key: "numberVerified" },
      { key: "knownDevice" },
      { key: "normalLocation" },
      { key: "normalBehavior" },
    ],
  },
  false_positive: {
    transaction_id: "txn_mock_false_positive",
    trust_index: 20,
    decision: "ADAPTIVE_VERIFICATION",
    signals: {
      number_verification: { verified: true },
      sim_swap: { swapped_recently: true, hours_since_swap: 3, weight: -25 },
      device_swap: { swapped_recently: true, hours_since_swap: 5, weight: -15 },
      location_verification: { verified: false, verification_result: "FALSE" },
    },
    reasons: [
      { key: "numberVerified" },
      { key: "recentSimChange", params: { hours: 3 } },
      { key: "newDevice", params: { hours: 5 } },
      { key: "unusualLocation" },
    ],
  },
  suspicious: {
    transaction_id: "txn_mock_suspicious",
    trust_index: 45,
    decision: "TRANSACTION_HOLD",
    signals: {
      number_verification: { verified: true },
      sim_swap: { swapped_recently: true, hours_since_swap: 1, weight: -25 },
      device_swap: { swapped_recently: true, hours_since_swap: 1, weight: -15 },
      location_verification: { verified: false, verification_result: "FALSE" },
    },
    reasons: [
      { key: "numberVerified" },
      { key: "recentSimChange", params: { hours: 1 } },
      { key: "unknownDevice" },
      { key: "largeAmount" },
    ],
  },
  high_risk: {
    transaction_id: "txn_mock_high_risk",
    trust_index: 8,
    decision: "TEMPORARY_FREEZE",
    signals: {
      number_verification: { verified: false },
      sim_swap: { swapped_recently: true, hours_since_swap: 0.5, weight: -25 },
      device_swap: { swapped_recently: true, hours_since_swap: 0.5, weight: -15 },
      location_verification: { verified: false, verification_result: "FALSE" },
    },
    reasons: [
      { key: "numberVerificationFailed" },
      { key: "recentSimChange", params: { hours: 0.5 } },
      { key: "unknownDevice" },
      { key: "unusualLocation" },
      { key: "veryLargeAmount" },
    ],
  },
};

const MOCK_VERIFICATION: Omit<VerificationResult, "transaction_id"> = {
  trust_index: 82,
  decision: "ALLOW",
  reasons: [{ key: "verificationSucceeded" }, { key: "confidenceRecovered" }],
};

export async function runTransactionScenario(scenario: ScenarioId): Promise<TransactionResult> {
  await wait(SCENARIO_DELAY_MS);
  return MOCK_RESULTS[scenario];
}

export async function submitVerification(transactionId: string): Promise<VerificationResult> {
  await wait(VERIFY_DELAY_MS);
  return { transaction_id: transactionId, ...MOCK_VERIFICATION };
}
