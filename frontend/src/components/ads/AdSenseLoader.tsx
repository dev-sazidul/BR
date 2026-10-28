import { useEffect } from "react";

import { readAdSettings, shouldLoadAdSense } from "../../ads/adConfig";
import { loadAdSense } from "../../ads/adsense";
import { useAdConsent } from "../../ads/consent";

export function AdSenseLoader() {
  const settings = readAdSettings();
  const consent = useAdConsent();
  const load = shouldLoadAdSense(settings, consent.status);

  useEffect(() => {
    if (!load) return;
    loadAdSense(settings.clientId).catch(() => undefined);
  }, [load, settings.clientId]);

  return null;
}
