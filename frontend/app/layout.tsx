import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { ADSENSE_CLIENT_ID } from "../src/ads/publisher";
import { PwaRuntime } from "../src/pwa/PwaRuntime";
import { GA_MEASUREMENT_ID } from "../src/seo/ga";
import { GoogleAnalytics } from "../src/seo/GoogleAnalytics";
import { Providers } from "../src/shell/Providers";
import { loadPublicState } from "../src/seo/load-public";

import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "../src/styles/index.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://127.0.0.1:5173"),
  title: { default: "Solva — Remove Image Backgrounds", template: "%s" },
  description: "Solva removes image backgrounds and gives you a transparent PNG to download.",
  applicationName: "Solva",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Solva",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F6E6B",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initial = await loadPublicState();
  return (
    <html lang="en">
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/splash-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body>
        <Script id="ga4-init" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            try {
              var params = new URLSearchParams(location.search);
              var resetToken = params.get('token');
              if (resetToken && location.pathname === '/reset-password') {
                window.__solvaResetToken = resetToken;
                params.delete('token');
                var query = params.toString();
                history.replaceState(history.state, '', location.pathname + (query ? '?' + query : '') + location.hash);
              }
            } catch (e) {}
            gtag('js', new Date());
            var page = location.pathname || '/';
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false,
              page_path: page,
              page_location: location.origin + page
            });
          `}
        </Script>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Providers initial={initial}>{children}</Providers>
        <GoogleAnalytics />
        <PwaRuntime />
      </body>
    </html>
  );
}
