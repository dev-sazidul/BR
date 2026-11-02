"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "../auth/AuthProvider";
import { Layout } from "../components/layout/Layout";
import type { AppBootstrap } from "../seo/bootstrap";
import { AppConfigProvider } from "./ConfigProvider";

export function Providers({ children, initial }: { children: ReactNode; initial: AppBootstrap | null }) {
  return (
    <AppConfigProvider initial={initial}>
      <AuthProvider>
        <Layout>{children}</Layout>
      </AuthProvider>
    </AppConfigProvider>
  );
}
