import { describe, expect, it } from "vitest";

import { isValidClientId, isValidSlotId, readAdSettings, shouldLoadAdSense } from "./adConfig";

const empty = {
  DEV: false,
  VITE_ADSENSE_ENABLED: "",
  VITE_ADSENSE_CLIENT_ID: "",
  VITE_ADSENSE_MODE: "",
  VITE_ADSENSE_REQUIRE_CONSENT: "",
  VITE_ADSENSE_SLOT_HEADER: "",
  VITE_ADSENSE_SLOT_WORKSPACE: "",
  VITE_ADSENSE_SLOT_MID: "",
  VITE_ADSENSE_SLOT_FOOTER: "",
};

describe("ad configuration", () => {
  it("rejects the example publisher ID and empty slot IDs", () => {
    expect(isValidClientId("ca-pub-XXXXXXXXXXXXXXXX")).toBe(false);
    expect(isValidClientId("ca-pub-1234567890123456")).toBe(true);
    expect(isValidSlotId("")).toBe(false);
    expect(isValidSlotId("1234567890")).toBe(true);
  });

  it("shows development placeholders without loading AdSense", () => {
    const settings = readAdSettings({ ...empty, DEV: true });
    expect(settings.active).toBe(true);
    expect(settings.clientValid).toBe(false);
    expect(settings.mode).toBe("manual");
    expect(shouldLoadAdSense(settings, "granted")).toBe(false);
  });

  it("stays off in production until a real publisher ID exists", () => {
    const settings = readAdSettings({ ...empty, VITE_ADSENSE_CLIENT_ID: "ca-pub-XXXXXXXXXXXXXXXX" });
    expect(settings.active).toBe(false);
    expect(shouldLoadAdSense(settings, "granted")).toBe(false);
  });

  it("can be disabled even when a publisher ID is present", () => {
    const settings = readAdSettings({
      ...empty,
      DEV: true,
      VITE_ADSENSE_ENABLED: "false",
      VITE_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456",
      VITE_ADSENSE_SLOT_HEADER: "1234567890",
    });
    expect(settings.active).toBe(false);
    expect(shouldLoadAdSense(settings, "granted")).toBe(false);
  });

  it("loads manual units only after consent and a slot ID", () => {
    const settings = readAdSettings({
      ...empty,
      VITE_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456",
      VITE_ADSENSE_SLOT_HEADER: "1234567890",
      VITE_ADSENSE_REQUIRE_CONSENT: "true",
    });
    expect(shouldLoadAdSense(settings, "unknown")).toBe(false);
    expect(shouldLoadAdSense(settings, "denied")).toBe(false);
    expect(shouldLoadAdSense(settings, "granted")).toBe(true);
  });

  it("uses auto mode without requiring a slot ID, and not both formats at once", () => {
    const settings = readAdSettings({
      ...empty,
      VITE_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456",
      VITE_ADSENSE_MODE: "auto",
      VITE_ADSENSE_REQUIRE_CONSENT: "false",
    });
    expect(settings.mode).toBe("auto");
    expect(shouldLoadAdSense(settings, "unknown")).toBe(true);
    expect(settings.slots.header).toBe("");
  });
});
