import { NextResponse } from "next/server";

import { handle } from "../../../../src/server/errors";
import { publicConfig } from "../../../../src/server/publicState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => NextResponse.json(publicConfig()));
