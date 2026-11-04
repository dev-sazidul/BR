import { NextResponse, type NextRequest } from "next/server";

import { cleanEmail } from "../../../../../src/server/accounts";
import { db } from "../../../../../src/server/db";
import { handle, invalidRequest } from "../../../../../src/server/errors";
import { assertSameOrigin, clientIp, readJsonObject, stringField } from "../../../../../src/server/http";
import { sendMail } from "../../../../../src/server/mail";
import { enforceRateLimit } from "../../../../../src/server/rateLimit";
import { digest, newToken } from "../../../../../src/server/sessions";
import { serverSettings } from "../../../../../src/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESET_MINUTES = 60;
const MESSAGE = "If an account exists for that email, a reset link is on its way.";

/** The response is the same whether or not the email has an account. */
export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  enforceRateLimit("auth", clientIp(request));
  const body = await readJsonObject(request);
  const fields: Record<string, string[]> = {};
  const email = cleanEmail(stringField(body, "email"), fields);
  if (Object.keys(fields).length) throw invalidRequest(fields);

  const prisma = db();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.isActive) {
    const token = newToken();
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { id: digest(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) },
    });
    const link = `${serverSettings().siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
    // Not awaited: waiting on SMTP would reveal which emails have accounts.
    void sendMail({
      to: user.email,
      subject: "Reset your Solva password",
      text: [
        `Use this link to choose a new Solva password. It works once and expires in ${RESET_MINUTES} minutes.`,
        "If you did not ask for a reset, you can ignore this email.",
        "",
        link,
        "",
      ].join("\n"),
    }).catch((error: unknown) => console.error("Password reset email could not be sent", error));
  }
  return NextResponse.json({ message: MESSAGE });
});
