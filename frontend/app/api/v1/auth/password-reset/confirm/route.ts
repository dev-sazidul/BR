import { NextResponse, type NextRequest } from "next/server";

import { validateNewPassword } from "../../../../../../src/server/accounts";
import { db } from "../../../../../../src/server/db";
import { ApiError, handle } from "../../../../../../src/server/errors";
import { assertSameOrigin, clientIp, readJsonObject, stringField } from "../../../../../../src/server/http";
import { hashPassword } from "../../../../../../src/server/passwords";
import { enforceRateLimit } from "../../../../../../src/server/rateLimit";
import { digest } from "../../../../../../src/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function invalidLink(): ApiError {
  return new ApiError("invalid_token", "This reset link is invalid or has expired.", 400);
}

/** Sets the new password, uses up the link, and signs out every browser. */
export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  enforceRateLimit("auth", clientIp(request));
  const body = await readJsonObject(request);
  const token = stringField(body, "token");
  if (!token) throw invalidLink();

  const prisma = db();
  const record = await prisma.passwordResetToken.findUnique({
    where: { id: digest(token) },
    include: { user: true },
  });
  if (!record || !record.user.isActive) throw invalidLink();
  if (record.expiresAt <= new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
    throw invalidLink();
  }

  const password = stringField(body, "password");
  validateNewPassword(password, stringField(body, "confirm_password"), record.user);
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  return NextResponse.json({ message: "Your password has been updated. Sign in with the new password." });
});
