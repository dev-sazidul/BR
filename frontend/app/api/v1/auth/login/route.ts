import { NextResponse, type NextRequest } from "next/server";

import { cleanEmail, requireFields } from "../../../../../src/server/accounts";
import { db } from "../../../../../src/server/db";
import { ApiError, handle, invalidRequest } from "../../../../../src/server/errors";
import { assertSameOrigin, clientIp, readJsonObject, stringField } from "../../../../../src/server/http";
import { burnPasswordCheck, verifyPassword } from "../../../../../src/server/passwords";
import { enforceRateLimit } from "../../../../../src/server/rateLimit";
import { createSession, publicUser, setSessionCookies } from "../../../../../src/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function invalidCredentials(): ApiError {
  return new ApiError("invalid_credentials", "The email or password is incorrect.", 401);
}

/** `remember: false` makes a browser-session cookie with a 12-hour server limit. */
export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  enforceRateLimit("auth", clientIp(request));
  const body = await readJsonObject(request);
  const password = stringField(body, "password");
  requireFields({ email: stringField(body, "email"), password });
  const fields: Record<string, string[]> = {};
  const email = cleanEmail(stringField(body, "email"), fields);
  if (Object.keys(fields).length) throw invalidRequest(fields);

  const prisma = db();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    // Same cost as a real check, so response time does not reveal the email.
    await burnPasswordCheck(password);
    throw invalidCredentials();
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const response = NextResponse.json({ user: publicUser(user) });
  setSessionCookies(response, await createSession(user.id, body.remember !== false));
  return response;
});
