import type { NextRequest } from "next/server";

import { ApiError, handle } from "../../../../../src/server/errors";
import { clientIp, readBodyLimited } from "../../../../../src/server/http";
import { enforceRateLimit } from "../../../../../src/server/rateLimit";
import { removeBackground } from "../../../../../src/server/remover";
import { serverSettings } from "../../../../../src/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Room for the multipart boundary and headers around the file itself.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function fileTooLarge(): ApiError {
  return new ApiError("file_too_large", "That file is larger than the upload limit.", 413);
}

/**
 * Multipart field `image` in, transparent PNG out. Nothing is stored: the
 * cutout goes straight back to the browser.
 */
export const POST = handle(async (request: NextRequest) => {
  const settings = serverSettings();
  enforceRateLimit("removal", clientIp(request));

  let body: Uint8Array<ArrayBuffer>;
  try {
    body = await readBodyLimited(request, settings.maxUploadBytes + MULTIPART_OVERHEAD_BYTES);
  } catch (error) {
    if (error instanceof ApiError && error.status === 413) throw fileTooLarge();
    throw error;
  }

  let form: FormData;
  try {
    form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new ApiError("invalid_request", "The upload could not be read. Choose a PNG, JPG, or WebP image.", 400);
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    throw new ApiError("invalid_request", "Choose an image to upload.", 400, {
      fields: { image: ["Choose an image to upload."] },
    });
  }
  if (file.size === 0) throw new ApiError("empty_file", "That file is empty.", 400);
  if (file.size > settings.maxUploadBytes) throw fileTooLarge();

  const cutout = await removeBackground(new Uint8Array(await file.arrayBuffer()));
  return new Response(cutout.png, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'inline; filename="solva-cutout.png"',
      "Cache-Control": "no-store",
      "X-Image-Width": String(cutout.width),
      "X-Image-Height": String(cutout.height),
    },
  });
});
