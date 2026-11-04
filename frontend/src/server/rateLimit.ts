import { ApiError } from "./errors";
import { serverSettings } from "./settings";

/**
 * Fixed-window rate limits kept in this process's memory. That fits one
 * Next.js process. With several replicas, each one counts separately.
 */

type Window = { count: number; resetAt: number };

const UNITS: Record<string, number> = {
  s: 1_000,
  sec: 1_000,
  second: 1_000,
  m: 60_000,
  min: 60_000,
  minute: 60_000,
  h: 3_600_000,
  hour: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
};

const windows = new Map<string, Window>();

export function parseRate(rate: string): { limit: number; windowMs: number } {
  const match = /^\s*(\d+)\s*\/\s*([a-z]+)\s*$/i.exec(rate);
  const windowMs = match ? UNITS[match[2].toLowerCase()] : undefined;
  if (!match || !windowMs) throw new Error(`Rate "${rate}" must look like 10/minute.`);
  return { limit: Number(match[1]), windowMs };
}

export function consume(key: string, rate: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const { limit, windowMs } = parseRate(rate);
  if (windows.size > 10_000) {
    for (const [stored, window] of windows) {
      if (window.resetAt <= now) windows.delete(stored);
    }
  }
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

export function enforceRateLimit(scope: "removal" | "auth", ip: string): void {
  const settings = serverSettings();
  if (settings.disableRateLimits) return;
  const rate = scope === "removal" ? settings.removalRate : settings.authRate;
  const result = consume(`${scope}:${ip}`, rate);
  if (!result.ok) {
    throw new ApiError(
      "rate_limited",
      "Too many requests. Please wait and try again.",
      429,
      { wait_seconds: result.retryAfterSeconds },
      { "Retry-After": String(result.retryAfterSeconds) },
    );
  }
}

export function resetRateLimitsForTests(): void {
  windows.clear();
}
