import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' blob: data: https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://www.googleadservices.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://www.googletagservices.com https://adservice.google.com https://tpc.googlesyndication.com https://www.google.com https://fundingchoicesmessages.google.com https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://adservice.google.com https://ep1.adtrafficquality.google https://fundingchoicesmessages.google.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com https://*.analytics.google.com",
      "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

function publishedEnv(name: string): string {
  return process.env[`NEXT_PUBLIC_${name}`] || process.env[`VITE_${name}`] || "";
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ADSENSE_ENABLED: publishedEnv("ADSENSE_ENABLED"),
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: publishedEnv("ADSENSE_CLIENT_ID"),
    NEXT_PUBLIC_ADSENSE_MODE: publishedEnv("ADSENSE_MODE"),
    NEXT_PUBLIC_ADSENSE_REQUIRE_CONSENT: publishedEnv("ADSENSE_REQUIRE_CONSENT"),
    NEXT_PUBLIC_ADSENSE_SLOT_HEADER: publishedEnv("ADSENSE_SLOT_HEADER"),
    NEXT_PUBLIC_ADSENSE_SLOT_WORKSPACE: publishedEnv("ADSENSE_SLOT_WORKSPACE"),
    NEXT_PUBLIC_ADSENSE_SLOT_MID: publishedEnv("ADSENSE_SLOT_MID"),
    NEXT_PUBLIC_ADSENSE_SLOT_FOOTER: publishedEnv("ADSENSE_SLOT_FOOTER"),
  },
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    const serviceWorker = {
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    };
    if (process.env.NODE_ENV !== "production") return [serviceWorker];
    return [serviceWorker, { source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
