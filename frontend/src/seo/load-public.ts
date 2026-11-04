import type { AppBootstrap } from "./bootstrap";
import { publicConfig, publicHealth } from "../server/publicState";

let cache: { expires: number; value: AppBootstrap } | null = null;

/**
 * Limits and model health for the first render, so the page does not flash
 * defaults. Health is cached for five seconds to keep page loads cheap.
 */
export async function loadPublicState(): Promise<AppBootstrap> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.value;
  const value = { config: publicConfig(), health: await publicHealth() };
  cache = { expires: now + 5_000, value };
  return value;
}
