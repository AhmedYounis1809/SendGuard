import { ApiService } from "../../../core/network/api-service";
import type { CamaraVerificationResponse } from "../types/camara-verification.types";

const CAMARA_VERIFY_ENDPOINT = "/api/camara/verify";

export function runCamaraVerification(): Promise<CamaraVerificationResponse> {
  return ApiService.post<CamaraVerificationResponse>(CAMARA_VERIFY_ENDPOINT);
}
