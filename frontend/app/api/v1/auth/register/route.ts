import { NextResponse, type NextRequest } from "next/server";

import { EMAIL_TAKEN, isUniqueViolation, validateRegistration } from "../../../../../src/server/accounts";
import { db } from "../../../../../src/server/db";
import { handle, invalidRequest } from "../../../../../src/server/errors";
import { assertSameOrigin, clientIp, readJsonObject, stringField } from "../../../../../src/server/http";
import { hashPassword } from "../../../../../src/server/passwords";
import { enforceRateLimit } from "../../../../../src/server/rateLimit";
import { createSession, publicUser, setSessionCookies } from "../../../../../src/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  enforceRateLimit("auth", clientIp(request));
  const body = await readJsonObject(request);
  const password = stringField(body, "password");
  const { name, email } = validateRegistration({
    name: stringField(body, "name"),
    email: stringField(body, "email"),
    password,
    confirmPassword: stringField(body, "confirm_password"),
  });

  const prisma = db();
  if (await prisma.user.findUnique({ where: { email } })) throw invalidRequest({ email: [EMAIL_TAKEN] });
  let user;
  try {
    user = await prisma.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  } catch (error) {
    if (isUniqueViolation(error)) throw invalidRequest({ email: [EMAIL_TAKEN] });
    throw error;
  }

  const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  setSessionCookies(response, await createSession(user.id, true));
  return response;
});
