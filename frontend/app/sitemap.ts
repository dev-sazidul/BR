import type { MetadataRoute } from "next";

import { SITEMAP_PATHS } from "../src/seo/metadata";

function origin(): string {
  return (process.env.SITE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({ url: `${origin()}${path}` }));
}
