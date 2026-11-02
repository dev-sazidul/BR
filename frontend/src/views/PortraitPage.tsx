"use client";

import { useDocumentTitle } from "../hooks/useObjectUrl";
import { useAppConfig } from "../shell/ConfigProvider";
import { PortraitTool } from "../components/portrait/PortraitTool";

export function PortraitPage() {
  useDocumentTitle("Portrait and passport photos");
  const { health, config } = useAppConfig();

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      <PortraitTool
        maxBytes={config.max_upload_bytes}
        maxDimension={config.max_dimension_px}
        aiReady={health ? health.ai.available : true}
        aiDetail={health && !health.ai.available ? health.ai.detail : null}
      />
    </section>
  );
}
