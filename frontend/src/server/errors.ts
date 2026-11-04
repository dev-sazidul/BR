import { NextResponse } from "next/server";

/** Every API error uses {"error": {"code", "message", "details"}}. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

function errorBody(code: string, message: string, details: Record<string, unknown> = {}) {
  return { error: { code, message, details } };
}

export function errorResponse(error: ApiError): NextResponse {
  return NextResponse.json(errorBody(error.code, error.message, error.details), {
    status: error.status,
    headers: error.headers,
  });
}

/** Field errors keep the first message as the summary, like the forms expect. */
export function invalidRequest(fields: Record<string, string[]>): ApiError {
  const first = Object.values(fields).find((messages) => messages.length > 0)?.[0];
  return new ApiError("invalid_request", first ?? "Check the form and try again.", 400, { fields });
}

/**
 * Wrap a route handler so thrown ApiErrors become JSON responses and anything
 * else becomes a generic 500 without leaking the cause.
 */
export function handle<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      console.error("Unhandled API error", error);
      return errorResponse(new ApiError("server_error", "Something went wrong. Please try again.", 500));
    }
  };
}
