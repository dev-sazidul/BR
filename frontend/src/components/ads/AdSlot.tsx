import { useEffect, useRef } from "react";

import {
  isValidSlotId,
  readAdSettings,
  slotSize,
  type AdPlacement,
  type ConsentStatus,
} from "../../ads/adConfig";
import { loadAdSense } from "../../ads/adsense";
import { useAdConsent } from "../../ads/consent";
import { AdContainer } from "./AdContainer";

type AdSlotProps = {
  placement: AdPlacement;
};

function allowsLiveAds(requireConsent: boolean, status: ConsentStatus): boolean {
  return !requireConsent || status === "granted";
}

export function AdSlot({ placement }: AdSlotProps) {
  const settings = readAdSettings();
  const consent = useAdConsent();
  const unitRef = useRef<HTMLModElement>(null);
  const slotId = settings.slots[placement];
  const live =
    settings.active &&
    settings.mode === "manual" &&
    settings.clientValid &&
    isValidSlotId(slotId) &&
    allowsLiveAds(settings.requireConsent, consent.status);

  useEffect(() => {
    const node = unitRef.current;
    if (!live || !node || node.dataset.solvaPushed === "true") return;
    let cancelled = false;
    loadAdSense(settings.clientId)
      .then(() => {
        if (cancelled || !node.isConnected || node.dataset.solvaPushed === "true") return;
        node.dataset.solvaPushed = "true";
        const queue = window.adsbygoogle ?? [];
        window.adsbygoogle = queue;
        queue.push({});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [live, settings.clientId, slotId]);

  if (!settings.active || settings.mode === "auto") return null;
  if (settings.clientValid && consent.status === "denied") return null;

  const minHeight = placement === "workspace" ? "250px" : "90px";

  return (
    <AdContainer placement={placement} size={slotSize(placement)}>
      {live ? (
        <ins
          ref={unitRef}
          className="adsbygoogle block w-full"
          style={{ display: "block", minHeight }}
          data-ad-client={settings.clientId}
          data-ad-slot={slotId}
          data-ad-format={placement === "workspace" ? "auto" : "horizontal"}
          data-full-width-responsive="true"
        />
      ) : (
        <p className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted">
          Reserved ad space. Nothing is shown here until an ad unit is configured.
        </p>
      )}
    </AdContainer>
  );
}
