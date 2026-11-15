import type { Metadata } from "next";

import { resolvePageMeta } from "./metadata";
import { getSiteOrigin } from "./siteConfig";

export function metadataFor(path: string): Metadata {
  const origin = getSiteOrigin();
  const meta = resolvePageMeta(path, origin);
  const index = meta.robots.startsWith("index,");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    robots: { index, follow: index },
    alternates: { canonical: meta.canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.canonical,
      siteName: "Solva",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}
