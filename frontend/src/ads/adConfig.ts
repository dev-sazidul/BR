export const AD_PLACEMENTS = ["header", "workspace", "midContent", "footer"] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];
export type AdMode = "manual" | "auto";
export type ConsentStatus = "unknown" | "granted" | "denied";

export type AdEnvironment = {
  DEV: boolean;
  VITE_ADSENSE_ENABLED?: string;
  VITE_ADSENSE_CLIENT_ID?: string;
  VITE_ADSENSE_MODE?: string;
  VITE_ADSENSE_REQUIRE_CONSENT?: string;
  VITE_ADSENSE_SLOT_HEADER?: string;
  VITE_ADSENSE_SLOT_WORKSPACE?: string;
  VITE_ADSENSE_SLOT_MID?: string;
  VITE_ADSENSE_SLOT_FOOTER?: string;
};

/**
 * Slot IDs belong here. Leave them empty until AdSense creates the units.
 * Environment variables override these values so a production build can supply
 * them without editing source. Do not put a guessed or example ID in either place.
 */
export const adSlotIds: Record<AdPlacement, string> = {
  header: "",
  workspace: "",
  midContent: "",
  footer: "",
};

export type AdSettings = {
  active: boolean;
  clientId: string;
  clientValid: boolean;
  mode: AdMode;
  requireConsent: boolean;
  slots: Record<AdPlacement, string>;
};

const CLIENT_ID = /^ca-pub-\d{16}$/;
const SLOT_ID = /^\d{9,11}$/;

export function isValidClientId(value: string): boolean {
  return CLIENT_ID.test(value.trim());
}

export function isValidSlotId(value: string): boolean {
  return SLOT_ID.test(value.trim());
}

function flag(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function pickSlot(fromEnv: string | undefined, fromFile: string): string {
  const envValue = (fromEnv ?? "").trim();
  return envValue || fromFile.trim();
}

export function readAdSettings(env: AdEnvironment = import.meta.env): AdSettings {
  const enabled = flag(env.VITE_ADSENSE_ENABLED);
  const clientId = (env.VITE_ADSENSE_CLIENT_ID ?? "").trim();
  const clientValid = isValidClientId(clientId);
  const mode: AdMode = flag(env.VITE_ADSENSE_MODE) === "auto" ? "auto" : "manual";
  const requireConsent = flag(env.VITE_ADSENSE_REQUIRE_CONSENT) !== "false";

  let active = false;
  if (enabled === "false" || enabled === "0" || enabled === "off") {
    active = false;
  } else if (enabled === "true" || enabled === "1" || enabled === "on") {
    active = true;
  } else if (env.DEV) {
    active = true;
  } else {
    active = clientValid;
  }

  return {
    active,
    clientId,
    clientValid,
    mode,
    requireConsent,
    slots: {
      header: pickSlot(env.VITE_ADSENSE_SLOT_HEADER, adSlotIds.header),
      workspace: pickSlot(env.VITE_ADSENSE_SLOT_WORKSPACE, adSlotIds.workspace),
      midContent: pickSlot(env.VITE_ADSENSE_SLOT_MID, adSlotIds.midContent),
      footer: pickSlot(env.VITE_ADSENSE_SLOT_FOOTER, adSlotIds.footer),
    },
  };
}

export function shouldLoadAdSense(settings: AdSettings, consent: ConsentStatus): boolean {
  if (!settings.active || !settings.clientValid) return false;
  if (settings.requireConsent && consent !== "granted") return false;
  if (settings.mode === "auto") return true;
  return AD_PLACEMENTS.some((placement) => isValidSlotId(settings.slots[placement]));
}

export function slotSize(placement: AdPlacement): "banner" | "rectangle" {
  return placement === "workspace" ? "rectangle" : "banner";
}
