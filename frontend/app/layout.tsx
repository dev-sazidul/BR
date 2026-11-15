import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { GA_MEASUREMENT_ID } from "../src/seo/ga";
import { GoogleAnalytics } from "../src/seo/GoogleAnalytics";
import { getSiteOrigin } from "../src/seo/siteConfig";
import { Providers } from "../src/shell/Providers";
import { loadPublicState } from "../src/seo/load-public";

import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "../src/styles/index.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: { default: "Solva — Remove Image Backgrounds", template: "%s" },
  description: "Solva removes image backgrounds and gives you a transparent PNG to download.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F6E6B",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initial = await loadPublicState();
  return (
    <html lang="en">
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
      </body>
    </html>
  );
}
