import { headers } from "next/headers";

import { resolvePageMeta } from "./metadata";

export async function JsonLd({ path }: { path: string }) {
  const headerList = await headers();
  const configured = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
  const forwarded = headerList.get("x-forwarded-proto");
  const proto = forwarded?.split(",")[0]?.trim() || "http";
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "127.0.0.1:5173";
  const origin = configured || `${proto}://${host}`;
  const meta = resolvePageMeta(path, origin);
  return (
    <script
      id="solva-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
