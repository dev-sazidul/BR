import type { HealthResponse, PublicConfig } from "../types/api";

/** Limits and health rendered on the server, so the first paint shows real values. */
export type AppBootstrap = {
  config: PublicConfig;
  health: HealthResponse | null;
};
