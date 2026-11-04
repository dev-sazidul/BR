import { ApiError } from "./errors";
import { serverSettings } from "./settings";

const JSON_LIMIT_BYTES = 16 * 1024;

function tooLarge(limit: number): ApiError {
  return new ApiError("file_too_large", `That request is larger than the ${limit} byte limit.`, 413);
}

/** Read the body without trusting Content-Length, stopping once `limit` is passed. */
export async function readBodyLimited(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > limit) throw tooLarge(limit);
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw tooLarge(limit);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const body = await readBodyLimited(request, JSON_LIMIT_BYTES);
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(body) || "{}");
  } catch {
    throw new ApiError("invalid_request", "The request body must be JSON.", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError("invalid_request", "The request body must be a JSON object.", 400);
  }
  return parsed as Record<string, unknown>;
}

export function stringField(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  return typeof value === "string" ? value : "";
}

/**
 * The client address for rate limits.
 *
 * Next.js only fills in X-Forwarded-For when the request has none, so the
 * leftmost entry is whatever the client sent. Each trusted reverse proxy
 * appends the address it saw, so the entry `trustedProxyCount` from the right
 * is the first one a client cannot forge. Without a proxy in front, any client
 * can choose this value: put Next.js behind one in production.
 */
export function clientIp(request: Request, trustedProxyCount = serverSettings().trustedProxyCount): string {
  const entries = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return "unknown";
  const index = entries.length - Math.max(1, trustedProxyCount);
  return entries[Math.max(0, index)];
}

/**
 * Refuse cross-site writes. Session cookies are SameSite=Lax, which already
 * keeps them off cross-site POSTs; this is a second check on the Origin header.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError("forbidden_origin", "Cross-site requests are not allowed.", 403);
  }
  const allowed = new Set<string>();
  for (const header of ["host", "x-forwarded-host"]) {
    const value = request.headers.get(header);
    if (value) allowed.add(value.split(",")[0].trim());
  }
  try {
    allowed.add(new URL(serverSettings().siteUrl).host);
  } catch {
    // An invalid SITE_URL only removes that one allowed host.
  }
  if (!allowed.has(originHost)) {
    throw new ApiError("forbidden_origin", "Cross-site requests are not allowed.", 403);
  }
}
