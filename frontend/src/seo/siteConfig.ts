export const PRODUCTION_DOMAIN = "https://imagecustomize.site";
export const LOCAL_DEV_DOMAIN = "http://127.0.0.1:5173";

export const DEFAULT_PRODUCTION_URL = PRODUCTION_DOMAIN;
export const DEFAULT_LOCAL_URL = LOCAL_DEV_DOMAIN;

export function getSiteOrigin(): string {
  const envUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_DOMAIN;
  }
  return LOCAL_DEV_DOMAIN;
}
