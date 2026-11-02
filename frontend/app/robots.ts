import type { MetadataRoute } from "next";

function origin(): string {
  return (process.env.SITE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/account", "/forgot-password", "/reset-password"],
    },
    sitemap: `${origin()}/sitemap.xml`,
  };
}
