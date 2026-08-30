import { AxiosError, type AxiosRequestConfig } from "axios";
import { axiosClient } from "./axios-client";
import { ApiExceptions } from "./api-exceptions";

export class ApiService {
  static async get<T = unknown>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosClient.get<T>(endpoint, config);
      return response.data;
    } catch (error) {
      throw ApiExceptions.handleError(error as AxiosError);
    }
  }

  static async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await axiosClient.post<T>(endpoint, body, config);
      return response.data;
    } catch (error) {
      throw ApiExceptions.handleError(error as AxiosError);
    }
  }

  static async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await axiosClient.patch<T>(endpoint, body, config);
      return response.data;
    } catch (error) {
      throw ApiExceptions.handleError(error as AxiosError);
    }
  }

  static async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await axiosClient.put<T>(endpoint, body, config);
      return response.data;
    } catch (error) {
      throw ApiExceptions.handleError(error as AxiosError);
    }
  }

  static async delete<T = unknown>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosClient.delete<T>(endpoint, config);
      return response.data;
    } catch (error) {
      throw ApiExceptions.handleError(error as AxiosError);
    }
  }
}
