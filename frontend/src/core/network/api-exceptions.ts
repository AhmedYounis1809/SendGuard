import { AxiosError } from "axios";
import { ApiError } from "./api-error";
import { NetworkErrorMessages } from "./network-error-messages";

export class ApiExceptions {
  static handleError(error: AxiosError): ApiError {
    const statusCode = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;

    // eslint-disable-next-line no-console
    console.error(
      `[API ERROR] status=${statusCode ?? "n/a"} url=${error.config?.url ?? "unknown"}`,
    );
    if (error.message) console.error(`[API ERROR] message=${error.message}`);
    if (data) {
      const dataStr = JSON.stringify(data).toLowerCase();
      if (dataStr.startsWith('"<!doctype') || dataStr.includes("<html")) {
        console.error("[API ERROR] body=[HTML page - content hidden]");
      } else {
        console.error("[API ERROR] body=", data);
      }
    }

    if (statusCode && typeof data?.message === "string") {
      return new ApiError(data.message, statusCode);
    }

    if (!error.response && error.code === "ERR_NETWORK") {
      // The browser reports "no internet" and "server unreachable" (wrong
      // port, server not started, CORS preflight failure) identically —
      // there's no response to distinguish them by. connectionError covers
      // both without falsely blaming the user's network.
      return new ApiError(NetworkErrorMessages.connectionError);
    }

    switch (error.code) {
      case "ECONNABORTED":
        return new ApiError(NetworkErrorMessages.timeout);
      case "ERR_CANCELED":
        return new ApiError(NetworkErrorMessages.cancelled);
      default:
        break;
    }

    if (statusCode) {
      return new ApiError(
        statusCode >= 500 ? NetworkErrorMessages.badResponse : NetworkErrorMessages.unknown,
        statusCode,
      );
    }

    return new ApiError(NetworkErrorMessages.connectionError);
  }
}
