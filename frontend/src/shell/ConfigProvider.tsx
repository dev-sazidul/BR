import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AppBootstrap } from "../seo/bootstrap";
import { fetchHealth, fetchPublicConfig } from "../services/imageService";
import { FALLBACK_CONFIG, type HealthResponse, type PublicConfig } from "../types/api";

type Status = "loading" | "ready" | "unavailable";

type AppConfigValue = {
  status: Status;
  config: PublicConfig;
  health: HealthResponse | null;
};

const AppConfigContext = createContext<AppConfigValue | null>(null);

export function AppConfigProvider({
  children,
  initial = null,
}: {
  children: ReactNode;
  initial?: AppBootstrap | null;
}) {
  const [status, setStatus] = useState<Status>(initial ? "ready" : "loading");
  const [config, setConfig] = useState<PublicConfig>(initial?.config ?? FALLBACK_CONFIG);
  const [health, setHealth] = useState<HealthResponse | null>(initial?.health ?? null);

  useEffect(() => {
    if (initial?.health?.ai?.available) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const [nextConfig, nextHealth] = await Promise.all([fetchPublicConfig(), fetchHealth()]);
        if (cancelled) return;
        setConfig(nextConfig);
        setHealth(nextHealth);
        setStatus("ready");
        if (!nextHealth?.ai?.available) {
          timer = setTimeout(load, 3000);
        }
      } catch {
        if (cancelled) return;
        setConfig(FALLBACK_CONFIG);
        setHealth(null);
        setStatus("unavailable");
        timer = setTimeout(load, 5000);
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [initial]);

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
