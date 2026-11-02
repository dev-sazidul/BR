import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "../../lib/navigation";

import { AdConsentNotice } from "../ads/AdConsentNotice";
import { AdConsentProvider } from "../ads/AdConsentProvider";
import { AdSenseLoader } from "../ads/AdSenseLoader";
import { AdSlot } from "../ads/AdSlot";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const element = document.querySelector(location.hash);
    if (!(element instanceof HTMLElement)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [location.hash, location.pathname]);

  return (
    <AdConsentProvider>
      <div className="flex min-h-screen min-w-0 flex-col bg-paper text-ink">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        <div className="pt-4">
          <AdSlot placement="header" />
        </div>
        <AdConsentNotice />
        <AdSenseLoader />
        <main id="content" className="min-w-0 flex-1">
          {children}
        </main>
        <div className="pb-8 pt-4">
          <AdSlot placement="footer" />
        </div>
        <Footer />
      </div>
    </AdConsentProvider>
  );
}
