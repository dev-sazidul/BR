import { createContext, useContext } from "react";

import type { ConsentStatus } from "./adConfig";

export const CONSENT_STORAGE_KEY = "solva.adsense.consent";

type AdConsentValue = {
  status: ConsentStatus;
  grant: () => void;
  deny: () => void;
};

export const AdConsentContext = createContext<AdConsentValue | null>(null);

export function readStoredConsent(): ConsentStatus {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {
    return "unknown";
  }
  return "unknown";
}

export function writeStoredConsent(status: Exclude<ConsentStatus, "unknown">): void {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
}

export function useAdConsent(): AdConsentValue {
  const value = useContext(AdConsentContext);
  if (!value) {
    throw new Error("Advertising consent is only available inside the page layout.");
  }
  return value;
}
