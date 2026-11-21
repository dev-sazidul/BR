import { NextResponse } from "next/server";

import { handle } from "../../../../../src/server/errors";
import { ApiError } from "../../../../../src/server/errors";
import { clientIp } from "../../../../../src/server/http";
import { consume } from "../../../../../src/server/rateLimit";
import { serverSettings } from "../../../../../src/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_PAGE = 12;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 200;
type Photo = {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: { medium: string; large: string };
};
type SearchResult = { photos: Photo[]; page: number; hasNextPage: boolean };
const cache = new Map<string, { expiresAt: number; result: SearchResult }>();

export const GET = handle(async (request: Request) => {
  const settings = serverSettings();
  if (!settings.pexelsApiKey) {
    throw new ApiError("background_search_unavailable", "Online background search is not configured yet. Add a free PEXELS_API_KEY on the server to enable it.", 503);
  }

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  const orientation = params.get("orientation") === "portrait" ? "portrait" : "landscape";
  if (query.length < 2) throw new ApiError("invalid_request", "Describe a scene with at least two characters.", 400);
  if (!Number.isInteger(page) || page < 1 || page > 1000) throw new ApiError("invalid_request", "That results page is invalid.", 400);

  const cacheKey = `${query.toLowerCase()}|${page}|${orientation}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.result, { headers: { "Cache-Control": "private, max-age=300" } });
  }
  cache.delete(cacheKey);

  const limit = consume(`background-search:${clientIp(request, settings.trustedProxyCount)}`, settings.backgroundSearchRate, now);
  if (!limit.ok) {
    throw new ApiError("rate_limited", "Too many background searches. Please wait before searching again.", 429, {}, { "Retry-After": String(limit.retryAfterSeconds) });
  }
  const hourlyQuota = consume("background-search:pexels:hour", "180/hour", now);
  const monthQuota = consume("background-search:pexels:month", "18000/month", now);
  if (!hourlyQuota.ok || !monthQuota.ok) {
    const retryAfter = Math.max(
      hourlyQuota.ok ? 0 : hourlyQuota.retryAfterSeconds,
      monthQuota.ok ? 0 : monthQuota.retryAfterSeconds,
    );
    throw new ApiError("rate_limited", "The site's free Pexels search allowance is temporarily used up. Please try again later.", 429, {}, { "Retry-After": String(retryAfter) });
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("orientation", orientation);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: settings.pexelsApiKey },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("background_search_failed", "Pexels could not be reached. Try again shortly or use a preset/custom background.", 502);
  }
  if (response.status === 429) throw new ApiError("rate_limited", "The free Pexels search limit was reached. Please try again later.", 429);
  if (!response.ok) throw new ApiError("background_search_failed", "Pexels search is temporarily unavailable.", 502);

  const payload = (await response.json()) as { photos?: Photo[]; next_page?: string };
  const result: SearchResult = {
    photos: (payload.photos ?? []).filter((photo) =>
      Number.isSafeInteger(photo.id) &&
      typeof photo.url === "string" && photo.url.startsWith("https://www.pexels.com/") &&
      typeof photo.photographer === "string" &&
      typeof photo.photographer_url === "string" && photo.photographer_url.startsWith("https://www.pexels.com/") &&
      typeof photo.src?.medium === "string" && photo.src.medium.startsWith("https://images.pexels.com/") &&
      typeof photo.src?.large === "string" && photo.src.large.startsWith("https://images.pexels.com/"),
    ),
    page,
    hasNextPage: typeof payload.next_page === "string",
  };
  if (cache.size >= CACHE_LIMIT) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=300" } });
});
