// Shared types for the SendGuard Agent API — used by BOTH the
// camara-verification feature and the trust-dashboard feature, so neither
// one depends on the other's files.

export interface AgentTransactionInput {
  phone_number: string;
  amount: number;
  currency: string;
  is_new_beneficiary: boolean;
  recent_transaction_count_10min: number;
  usual_latitude: number;
  usual_longitude: number;
  location_reference_available: boolean;
  trusted_device_available: boolean;
}

export interface AgentTestResult {
  trust_index: number;
  tier: string;
  action: string;
  execution: Record<string, unknown>;
  reasons: string[];
  signals_checked: string[];
  signals_not_checked: string[];
  degraded_signals: string[];
  raw_signals: Record<string, Record<string, unknown>>;
  agent_mode: string;
  recommendation_mode: string;
  fallback_reason: string | null;
}