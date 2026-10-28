import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchHealth, fetchPublicConfig } from "../services/imageService";
import { FALLBACK_CONFIG, type HealthResponse, type PublicConfig } from "../types/api";

type Status = "loading" | "ready" | "unavailable";

type AppConfigValue = {
  status: Status;
  config: PublicConfig;
  health: HealthResponse | null;
};

const AppConfigContext = createContext<AppConfigValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [config, setConfig] = useState<PublicConfig>(FALLBACK_CONFIG);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nextConfig, nextHealth] = await Promise.all([fetchPublicConfig(), fetchHealth()]);
        if (cancelled) return;
        setConfig(nextConfig);
        setHealth(nextHealth);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setConfig(FALLBACK_CONFIG);
        setHealth(null);
        setStatus("unavailable");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ status, config, health }), [status, config, health]);
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfigValue {
  const value = useContext(AppConfigContext);
  if (!value) {
    throw new Error("useAppConfig must be used within AppConfigProvider");
  }
  return value;
}
