import type { HealthResponse, PublicConfig } from "../types/api";

export type AppBootstrap = {
  config: PublicConfig;
  health: HealthResponse | null;
};

let current: AppBootstrap | null = null;

export function setAppBootstrap(value: AppBootstrap | null): void {
  current = value;
}

export function getAppBootstrap(): AppBootstrap | null {
  return current;
}

function isBootstrap(value: unknown): value is AppBootstrap {
  if (!value || typeof value !== "object") return false;
  const config = (value as AppBootstrap).config;
  return Boolean(config && typeof config.max_upload_bytes === "number" && typeof config.retention_minutes === "number");
}

export function readBootstrapFromDom(): void {
  if (typeof document === "undefined") return;
  const node = document.getElementById("solva-bootstrap");
  if (!node?.textContent) return;
  try {
    const parsed: unknown = JSON.parse(node.textContent);
    setAppBootstrap(isBootstrap(parsed) ? parsed : null);
  } catch {
    setAppBootstrap(null);
  }
}
