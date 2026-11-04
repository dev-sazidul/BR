import { NextResponse, type NextRequest } from "next/server";

import { requireFields, validateNewPassword } from "../../../../../src/server/accounts";
import { db } from "../../../../../src/server/db";
import { handle, invalidRequest } from "../../../../../src/server/errors";
import { assertSameOrigin, clientIp, readJsonObject, stringField } from "../../../../../src/server/http";
import { hashPassword, verifyPassword } from "../../../../../src/server/passwords";
import { enforceRateLimit } from "../../../../../src/server/rateLimit";
import { createSession, publicUser, requireSession, setSessionCookies } from "../../../../../src/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Replaces the password, signs out every other browser, and renews this one. */
export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  enforceRateLimit("auth", clientIp(request));
  const session = await requireSession(request);
  const body = await readJsonObject(request);
  const current = stringField(body, "current_password");
  const next = stringField(body, "new_password");
  requireFields({ current_password: current, new_password: next });
  if (!(await verifyPassword(current, session.user.passwordHash))) {
    throw invalidRequest({ current_password: ["The current password is incorrect."] });
  }
  validateNewPassword(next, stringField(body, "confirm_password"), session.user, "new_password");

  const prisma = db();
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });

  const response = NextResponse.json({ user: publicUser(user) });
  setSessionCookies(response, await createSession(user.id, session.persistent));
  return response;
});
