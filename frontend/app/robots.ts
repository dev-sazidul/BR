import type { MetadataRoute } from "next";

import { getSiteOrigin } from "../src/seo/siteConfig";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/account", "/forgot-password", "/reset-password"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
