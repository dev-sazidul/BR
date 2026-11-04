import type { HealthResponse, PublicConfig } from "../types/api";
import { removerHealth } from "./remover";
import { serverSettings } from "./settings";

/** Only public limits. No secrets, hosts, or tokens. */
export function publicConfig(): PublicConfig {
  const settings = serverSettings();
  return {
    max_upload_bytes: settings.maxUploadBytes,
    max_dimension_px: settings.maxDimensionPx,
    supported_formats: ["PNG", "JPEG", "WEBP"],
    output_formats: ["png", "jpeg"],
    ai_model: settings.removerModel,
    contact_email: settings.contactEmail,
  };
}

export async function publicHealth(): Promise<HealthResponse> {
  const remover = await removerHealth();
  return {
    status: remover.available ? "ok" : "degraded",
    service: "solva",
    ai: {
      provider: "remover",
      model: remover.model,
      available: remover.available,
      model_cached: remover.model_cached,
      detail: remover.detail,
    },
  };
}
