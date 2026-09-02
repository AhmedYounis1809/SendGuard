import { ApiService } from "../../../core/network/api-service";

const AGENT_RUN_ENDPOINT = "/api/agent/run";

export interface AgentTestResult {
  trust_index: number;
  tier: string;
  action: string;
  execution: Record<string, unknown>;
  reasons: string[];
  signals_checked: string[];
  signals_not_checked: string[];
  degraded_signals: string[];
  raw_signals: Record<string, unknown>;
}

export function runAgentTest(phoneNumber: string): Promise<AgentTestResult> {
  return ApiService.post<AgentTestResult>(AGENT_RUN_ENDPOINT, {
    phone_number: phoneNumber,
  });
}