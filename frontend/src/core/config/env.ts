export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  // Matches backend/app/main.py's CamaraVerifyRequest default — Nokia's
  // Simulator Mode test number, used when the user hasn't typed one in.
  defaultPhoneNumber: import.meta.env.VITE_DEFAULT_PHONE_NUMBER ?? "+99999991000",
} as const;
