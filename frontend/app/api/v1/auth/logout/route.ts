import { NextResponse, type NextRequest } from "next/server";

import { db } from "../../../../../src/server/db";
import { handle } from "../../../../../src/server/errors";
import { assertSameOrigin } from "../../../../../src/server/http";
import { clearSessionCookies, readSession } from "../../../../../src/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ends this browser's session. Succeeds even when nobody is signed in. */
export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  const session = await readSession(request);
  if (session) await db().session.deleteMany({ where: { id: session.id } });
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
});
