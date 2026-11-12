import type { Metadata } from "next";

import { resolvePageMeta } from "./metadata";

export function metadataFor(path: string): Metadata {
  const meta = resolvePageMeta(path, "http://127.0.0.1:5173");
  const index = meta.robots.startsWith("index,");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    robots: { index, follow: index },
    alternates: { canonical: meta.path },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.path,
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
