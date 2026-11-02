import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

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
        <Providers initial={initial}>{children}</Providers>
      </body>
    </html>
  );
}
