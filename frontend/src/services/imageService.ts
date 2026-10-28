import { api } from "./api";
import { downloadBlob } from "../utils/download";
import type { HealthResponse, PublicConfig, RemovalResult } from "../types/api";

type UploadOptions = {
  signal?: AbortSignal;
  onUploadProgress?: (loaded: number, total?: number) => void;
};

export async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await api.get<PublicConfig>("/api/v1/config/");
  return response.data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/api/v1/health/");
  return response.data;
}

export async function removeBackground(file: File, options: UploadOptions = {}): Promise<RemovalResult> {
  const body = new FormData();
  body.append("image", file, file.name);
  const response = await api.post<RemovalResult>("/api/v1/images/remove-background/", body, {
    signal: options.signal,
    timeout: 180_000,
    onUploadProgress: (event) => options.onUploadProgress?.(event.loaded, event.total),
  });
  return response.data;
}

export async function fetchResultBlob(resultUrl: string, signal?: AbortSignal): Promise<Blob> {
  const response = await api.get<Blob>(resultUrl, { responseType: "blob", signal });
  if (response.data.type && !response.data.type.startsWith("image/")) {
    throw new Error("The server did not return an image.");
  }
  return response.data;
}

export async function downloadResult(
  downloadUrl: string,
  format: "png" | "jpeg",
  background?: string,
): Promise<void> {
  const params = new URLSearchParams({ format });
  if (format === "jpeg" && background) params.set("background", background);
  const response = await api.get<Blob>(`${downloadUrl}?${params.toString()}`, { responseType: "blob" });
  downloadBlob(response.data, format === "jpeg" ? "solva-cutout.jpg" : "solva-cutout.png");
}
