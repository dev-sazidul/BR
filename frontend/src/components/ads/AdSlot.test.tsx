import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetAdSenseLoaderForTests } from "../../ads/adsense";
import { CONSENT_STORAGE_KEY } from "../../ads/consent";
import { AdConsentProvider } from "./AdConsentProvider";
import { AdSlot } from "./AdSlot";

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  resetAdSenseLoaderForTests();
});

function renderSlot() {
  return render(
    <AdConsentProvider>
      <AdSlot placement="header" />
    </AdConsentProvider>,
  );
}

describe("AdSlot", () => {
  it("reserves a labeled placeholder and leaves the AdSense script out", () => {
    renderSlot();
    expect(screen.getByRole("complementary", { name: "Advertisement" })).toBeInTheDocument();
    expect(screen.getByText(/Reserved ad space/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(document.querySelector("script[data-solva-adsense]")).toBeNull();
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
  });

  it("renders a manual unit only when the publisher and slot are configured", () => {
    vi.stubEnv("VITE_ADSENSE_ENABLED", "true");
    vi.stubEnv("VITE_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("VITE_ADSENSE_MODE", "manual");
    vi.stubEnv("VITE_ADSENSE_REQUIRE_CONSENT", "false");
    vi.stubEnv("VITE_ADSENSE_SLOT_HEADER", "1234567890");
    renderSlot();
    const unit = document.querySelector("ins.adsbygoogle");
    expect(unit).not.toBeNull();
    expect(unit?.getAttribute("data-ad-client")).toBe("ca-pub-1234567890123456");
    expect(unit?.getAttribute("data-ad-slot")).toBe("1234567890");
    expect(screen.queryByText(/Reserved ad space/)).not.toBeInTheDocument();
  });

  it("does not render a manual unit in auto mode", () => {
    vi.stubEnv("VITE_ADSENSE_ENABLED", "true");
    vi.stubEnv("VITE_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("VITE_ADSENSE_MODE", "auto");
    vi.stubEnv("VITE_ADSENSE_SLOT_HEADER", "1234567890");
    renderSlot();
    expect(screen.queryByRole("complementary", { name: "Advertisement" })).not.toBeInTheDocument();
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
  });
});
