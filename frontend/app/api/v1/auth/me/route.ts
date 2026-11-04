import { NextResponse, type NextRequest } from "next/server";

import { cleanName, requireFields } from "../../../../../src/server/accounts";
import { db } from "../../../../../src/server/db";
import { ApiError, errorResponse, handle, invalidRequest } from "../../../../../src/server/errors";
import { assertSameOrigin, clientIp, readJsonObject, stringField } from "../../../../../src/server/http";
import { verifyPassword } from "../../../../../src/server/passwords";
import { enforceRateLimit } from "../../../../../src/server/rateLimit";
import { clearSessionCookies, publicUser, readSession, requireSession } from "../../../../../src/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request: NextRequest) => {
  const session = await readSession(request);
  if (!session) {
    // Also drop a stale "signed in" hint so the page stops asking.
    const response = errorResponse(new ApiError("not_authenticated", "Sign in to continue.", 401));
    clearSessionCookies(response);
    return response;
  }
  return NextResponse.json(publicUser(session.user), { headers: { "Cache-Control": "no-store" } });
});

export const PATCH = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  const { user } = await requireSession(request);
  const body = await readJsonObject(request);
  const fields: Record<string, string[]> = {};
  const name = cleanName(stringField(body, "name"), fields);
  if (Object.keys(fields).length) throw invalidRequest(fields);
  const updated = await db().user.update({ where: { id: user.id }, data: { name } });
  return NextResponse.json(publicUser(updated));
});

export const DELETE = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  enforceRateLimit("auth", clientIp(request));
  const { user } = await requireSession(request);
  const body = await readJsonObject(request);
  const password = stringField(body, "password");
  requireFields({ password });
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError("invalid_credentials", "The password is incorrect.", 400);
  }
  // Sessions and reset tokens go with the user (onDelete: Cascade).
  await db().user.delete({ where: { id: user.id } });
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
});
