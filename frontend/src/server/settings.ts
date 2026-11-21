import { DEFAULT_LOCAL_URL, PRODUCTION_DOMAIN } from "../seo/siteConfig";

/**
 * Server settings, read from the environment on each call so tests and a
 * restarted process both see the current values. Nothing here is sent to the
 * browser except through /api/v1/config.
 */

function text(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? fallback : value.trim();
}

function int(name: string, fallback: number): number {
  const raw = text(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = text(name).toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

export function serverSettings() {
  const fallback = process.env.NODE_ENV === "production" ? PRODUCTION_DOMAIN : DEFAULT_LOCAL_URL;
  const siteUrl = text("SITE_URL", fallback).replace(/\/$/, "");
  return {
    production: process.env.NODE_ENV === "production",
    siteUrl,
    cookieSecure: bool("COOKIE_SECURE", siteUrl.startsWith("https://")),

    removerUrl: text("REMOVER_URL", "http://127.0.0.1:8001").replace(/\/$/, ""),
    removerToken: text("REMOVER_TOKEN"),
    removerModel: text("REMBG_MODEL", "u2net"),
    processingTimeoutSeconds: int("PROCESSING_TIMEOUT_SECONDS", 120),
    pexelsApiKey: text("PEXELS_API_KEY"),

    maxUploadBytes: int("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
    maxDimensionPx: int("MAX_DIMENSION_PX", 4096),

    removalRate: text("BACKGROUND_REMOVAL_RATE", "10/minute"),
    backgroundSearchRate: text("BACKGROUND_SEARCH_RATE", "60/hour"),
    authRate: text("AUTH_RATE", "8/minute"),
    disableRateLimits: bool("DISABLE_RATE_LIMITS", false),
    /** Reverse proxies in front of Next.js that append to X-Forwarded-For. */
    trustedProxyCount: Math.max(0, int("TRUSTED_PROXY_COUNT", 1)),

    contactEmail: text("CONTACT_EMAIL") || null,

    smtpHost: text("SMTP_HOST"),
    smtpPort: int("SMTP_PORT", 587),
    smtpUser: text("SMTP_USER"),
    smtpPassword: text("SMTP_PASSWORD"),
    smtpSecure: bool("SMTP_SECURE", false),
    mailFrom: text("MAIL_FROM", "Solva <noreply@localhost>"),
  };
}
