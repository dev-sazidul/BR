import { useMemo, useState, type ReactNode } from "react";

import { AdConsentContext, readStoredConsent, writeStoredConsent } from "../../ads/consent";

export function AdConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState(readStoredConsent);

  const value = useMemo(
    () => ({
      status,
      grant: () => {
        writeStoredConsent("granted");
        setStatus("granted");
      },
      deny: () => {
        writeStoredConsent("denied");
        setStatus("denied");
      },
    }),
    [status],
  );

  return <AdConsentContext.Provider value={value}>{children}</AdConsentContext.Provider>;
}
