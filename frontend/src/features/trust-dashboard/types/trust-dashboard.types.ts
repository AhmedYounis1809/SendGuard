export type ScenarioId = "legitimate" | "false_positive" | "suspicious" | "high_risk";

export type Decision =
  | "ALLOW"
  | "ADAPTIVE_VERIFICATION"
  | "TRANSACTION_HOLD"
  | "TEMPORARY_FREEZE";

export type SignalId =
  | "number_verification"
  | "sim_swap"
  | "device_swap"
  | "location_verification";

export interface NumberVerificationSignal {
  verified: boolean;
}

export interface SwapSignal {
  swapped_recently: boolean;
  hours_since_swap?: number;
  weight: number;
}

export interface LocationVerificationSignal {
  verified: boolean;
  verification_result: "TRUE" | "FALSE";
}

export interface TransactionSignals {
  number_verification: NumberVerificationSignal;
  sim_swap: SwapSignal;
  device_swap: SwapSignal;
  location_verification: LocationVerificationSignal;
}

export interface ReasonEntry {
  key: string;
  params?: Record<string, string | number>;
}

export interface TransactionResult {
  transaction_id: string;
  trust_index: number;
  decision: Decision;
  signals: TransactionSignals;
  reasons: ReasonEntry[];
}

export interface VerificationResult {
  transaction_id: string;
  trust_index: number;
  decision: Decision;
  reasons: ReasonEntry[];
}
