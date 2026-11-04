import { ApiError } from "./errors";
import { serverSettings } from "./settings";

/**
 * Client for the internal FastAPI service (remover/background_remover.py).
 * The browser never talks to it. Only these two calls cross that boundary.
 */

type RemoverHealth = {
  status: "ok" | "degraded";
  model: string | null;
  available: boolean;
  model_cached: boolean;
  detail: string;
};

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const token = serverSettings().removerToken;
  return token ? { ...extra, "X-Remover-Token": token } : extra;
}

export async function removerHealth(timeoutMs = 2_000): Promise<RemoverHealth> {
  const settings = serverSettings();
  try {
    const response = await fetch(`${settings.removerUrl}/health`, {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const body = (await response.json()) as Partial<RemoverHealth>;
    return {
      status: body.available ? "ok" : "degraded",
      model: typeof body.model === "string" ? body.model : null,
      available: body.available === true,
      model_cached: body.model_cached === true,
      detail: typeof body.detail === "string" ? body.detail : "",
    };
  } catch {
    return {
      status: "degraded",
      model: settings.removerModel,
      available: false,
      model_cached: false,
      detail: "The background removal service is not reachable.",
    };
  }
}

type Cutout = { png: ArrayBuffer; width: number; height: number };

export async function removeBackground(image: Uint8Array<ArrayBuffer>): Promise<Cutout> {
  const settings = serverSettings();
  let response: Response;
  try {
    response = await fetch(`${settings.removerUrl}/remove`, {
      method: "POST",
      body: image,
      headers: headers({ "Content-Type": "application/octet-stream" }),
      cache: "no-store",
      // A little longer than the service's own limit, so its 504 arrives first.
      signal: AbortSignal.timeout((settings.processingTimeoutSeconds + 15) * 1000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("timeout", "Background removal took too long and was stopped.", 504);
    }
    throw new ApiError("ai_unavailable", "The background removal service is not reachable.", 503);
  }

  if (!response.ok) throw await removerError(response);

  const png = await response.arrayBuffer();
  return {
    png,
    width: Number(response.headers.get("x-image-width")) || 0,
    height: Number(response.headers.get("x-image-height")) || 0,
  };
}

const PASSED_THROUGH = new Set([400, 413, 503, 504]);

async function removerError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON. Fall through to the generic error.
  }
  const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  if (PASSED_THROUGH.has(response.status) && typeof error?.code === "string" && typeof error.message === "string") {
    return new ApiError(error.code, error.message, response.status);
  }
  if (response.status === 401) {
    console.error("The remover rejected REMOVER_TOKEN. Set the same value for both services.");
  } else {
    console.error(`The remover returned an unexpected status ${response.status}.`);
  }
  return new ApiError("ai_unavailable", "Background removal is not available right now.", 503);
}
