"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

let lastTrackedPath = "";

function trackPageView(pathname: string) {
  if (typeof window.gtag !== "function") return;
  const page = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (page === lastTrackedPath) return;
  lastTrackedPath = page;
  window.gtag("event", "page_view", {
    page_path: page,
    page_location: `${window.location.origin}${page}`,
    page_title: document.title,
  });
}

export function GoogleAnalytics() {
  const pathname = usePathname() || "/";
  const initialPath = useRef<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const page = pathname.startsWith("/") ? pathname : `/${pathname}`;
      // The GA4 tag already sends the first page_view. Sending it again would double-count.
      if (initialPath.current === null) {
        initialPath.current = page;
        lastTrackedPath = page;
        return;
      }
      trackPageView(page);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
