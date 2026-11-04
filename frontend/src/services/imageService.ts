import { api } from "./api";
import type { HealthResponse, PublicConfig, RemovalResult } from "../types/api";

type UploadOptions = {
  signal?: AbortSignal;
  onUploadProgress?: (loaded: number, total?: number) => void;
};

export async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await api.get<PublicConfig>("/api/v1/config");
  return response.data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/api/v1/health");
  return response.data;
}

/** One request: the response body is the transparent PNG. */
export async function removeBackground(file: File, options: UploadOptions = {}): Promise<RemovalResult> {
  const body = new FormData();
  body.append("image", file, file.name);
  const response = await api.post<Blob>("/api/v1/images/remove-background", body, {
    responseType: "blob",
    signal: options.signal,
    timeout: 180_000,
    onUploadProgress: (event) => options.onUploadProgress?.(event.loaded, event.total),
  });
  if (response.data.type && !response.data.type.startsWith("image/")) {
    throw new Error("The server did not return an image.");
  }
  return {
    blob: response.data,
    width: Number(response.headers["x-image-width"]) || 0,
    height: Number(response.headers["x-image-height"]) || 0,
  };
}
