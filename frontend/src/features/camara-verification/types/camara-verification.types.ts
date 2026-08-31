export type CamaraSignalId = "sim_swap" | "device_swap" | "location_verification";

export interface CamaraVerificationStep {
  step: number;
  id: CamaraSignalId;
  name: string;
  passed: boolean;
  detail: string;
}

export interface CamaraVerificationResponse {
  steps: CamaraVerificationStep[];
  all_passed: boolean;
}
