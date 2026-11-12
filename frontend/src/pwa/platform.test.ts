import { describe, expect, it } from "vitest";

import { detectInstallPlatform, isInAppBrowser, isStandaloneDisplay } from "./platform";

describe("install platform", () => {
  it("recognizes iPhone, iPad, and iPadOS desktop user agents", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })).toBe("ios");
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" })).toBe("ios");
    expect(
      detectInstallPlatform({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe("ios");
  });

  it("recognizes Android and desktop browsers", () => {
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)" })).toBe("android");
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" })).toBe(
      "desktop",
    );
    expect(detectInstallPlatform({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605" })).toBe(
      "desktop",
    );
  });

  it("detects standalone display and in-app browsers", () => {
    expect(isStandaloneDisplay({ mediaStandalone: true })).toBe(true);
    expect(isStandaloneDisplay({ mediaStandalone: false, navigatorStandalone: true })).toBe(true);
    expect(isStandaloneDisplay({ mediaStandalone: false })).toBe(false);
    expect(isInAppBrowser("Mozilla/5.0 Instagram 300.0")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 Chrome/120.0.0.0")).toBe(false);
  });
});
