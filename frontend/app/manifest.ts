import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solva — Remove Image Backgrounds",
    short_name: "Solva",
    description: "Solva removes image backgrounds and gives you a transparent PNG to download.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F1EA",
    theme_color: "#0F6E6B",
    categories: ["photo", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      {
        src: "/icons/screenshot-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Solva on a desktop screen",
      },
      {
        src: "/icons/screenshot-narrow.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "Solva on a phone",
      },
    ],
  };
}
