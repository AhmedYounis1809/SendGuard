import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env";

function createAxiosClient(): AxiosInstance {
  return axios.create({
    baseURL: env.apiBaseUrl,
    headers: { "Content-Type": "application/json" },
    timeout: 30_000,
  });
}

// Single shared instance — no auth/token interceptors in this project, unlike
// the mobile client this pattern is based on: SendGuard has no user accounts,
// so there is nothing to attach or refresh here.
export const axiosClient = createAxiosClient();
