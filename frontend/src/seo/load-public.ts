import type { AppBootstrap } from "./bootstrap";
import type { HealthResponse, PublicConfig } from "../types/api";

let cache: { expires: number; value: AppBootstrap | null } | null = null;

function isConfig(value: unknown): value is PublicConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as PublicConfig;
  return typeof config.max_upload_bytes === "number" && typeof config.retention_minutes === "number";
}

function isHealth(value: unknown): value is HealthResponse {
  if (!value || typeof value !== "object") return false;
  const health = value as HealthResponse;
  return (health.status === "ok" || health.status === "degraded") && typeof health.ai?.available === "boolean";
}

export async function loadPublicState(): Promise<AppBootstrap | null> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.value;
  const value = await fetchPublicState();
  cache = { expires: now + 5_000, value };
  return value;
}

async function fetchPublicState(): Promise<AppBootstrap | null> {
  const origin = (process.env.API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/$/, "");
  try {
    const [configResponse, healthResponse] = await Promise.all([
      fetch(`${origin}/api/v1/config/`, { signal: AbortSignal.timeout(2_000) }),
      fetch(`${origin}/api/v1/health/`, { signal: AbortSignal.timeout(2_000) }),
    ]);
    if (!configResponse.ok || !healthResponse.ok) return null;
    const config: unknown = await configResponse.json();
    const health: unknown = await healthResponse.json();
    if (!isConfig(config) || !isHealth(health)) return null;
    return { config, health };
  } catch {
    return null;
  }
}
