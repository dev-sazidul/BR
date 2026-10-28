import { afterEach, describe, expect, it } from "vitest";

import { loadAdSense, resetAdSenseLoaderForTests } from "./adsense";

afterEach(() => {
  resetAdSenseLoaderForTests();
});

describe("AdSense script loader", () => {
  it("does not insert a script for an unconfigured publisher ID", async () => {
    await expect(loadAdSense("ca-pub-XXXXXXXXXXXXXXXX")).rejects.toThrow(/publisher ID/);
    expect(document.querySelector("script[data-solva-adsense]")).toBeNull();
  });

  it("inserts the official script once", async () => {
    const first = loadAdSense("ca-pub-1234567890123456");
    const second = loadAdSense("ca-pub-1234567890123456");
    expect(first).toBe(second);
    const scripts = document.querySelectorAll("script[data-solva-adsense]");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.getAttribute("src")).toBe(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456",
    );
    scripts[0]?.dispatchEvent(new Event("load"));
    await first;
  });
});
