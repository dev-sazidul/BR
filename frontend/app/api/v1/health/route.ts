import { NextResponse } from "next/server";

import { handle } from "../../../../src/server/errors";
import { publicHealth } from "../../../../src/server/publicState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 200 while Next.js is up. Read `ai.available` before uploading. */
export const GET = handle(async () => {
  return NextResponse.json(await publicHealth(), { headers: { "Cache-Control": "no-store" } });
});
