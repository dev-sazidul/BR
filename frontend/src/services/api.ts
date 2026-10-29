import axios from "axios";

import { readToken } from "../auth/storage";
import type { ApiErrorBody } from "../types/api";

const AUTHENTICATED_PATHS = ["/api/v1/auth/logout/", "/api/v1/auth/me/", "/api/v1/auth/change-password/"];

function needsAccountToken(url: string | undefined): boolean {
  if (!url) return false;
  return AUTHENTICATED_PATHS.some((path) => url.startsWith(path));
}

export function apiBaseUrl(value: string | undefined): string {
  const raw = (value || "").trim().replace(/\/$/, "");
  return raw.replace(/\/api\/v1$/, "");
}

export const api = axios.create({
  baseURL: apiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 180_000,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  if (!needsAccountToken(config.url)) return config;
  const token = readToken();
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (isApiError(data)) return data.error.message;
    if (error.response?.status === 413) return "That file is larger than the upload limit.";
    if (error.code === "ECONNABORTED") return "The request timed out. Try a smaller image.";
    if (!error.response) return "Could not reach the server. Check your connection and try again.";
    return "The image could not be processed. Please try again.";
  }
  return "The image could not be processed. Please try again.";
}

export async function readErrorMessage(error: unknown): Promise<string> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const parsed = JSON.parse(await error.response.data.text()) as ApiErrorBody;
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      return getErrorMessage(error);
    }
  }
  return getErrorMessage(error);
}

export function isAbortError(error: unknown): boolean {
  return axios.isAxiosError(error) && (error.code === "ERR_CANCELED" || axios.isCancel(error));
}

function isApiError(data: unknown): data is ApiErrorBody {
  if (!data || typeof data !== "object" || !("error" in data)) return false;
  const error = (data as ApiErrorBody).error;
  return Boolean(error && typeof error.message === "string" && error.message.trim());
}
