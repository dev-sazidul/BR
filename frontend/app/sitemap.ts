import type { MetadataRoute } from "next";

import { SITEMAP_PATHS } from "../src/seo/metadata";
import { getSiteOrigin } from "../src/seo/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  return SITEMAP_PATHS.map((path) => ({
    url: `${origin}${path === "/" ? "/" : path}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/blog") ? "weekly" : "monthly",
    priority: path === "/" ? 1.0 : path.startsWith("/blog") ? 0.8 : 0.6,
  }));
}
