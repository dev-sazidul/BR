"use client";

import { useAppConfig } from "../shell/ConfigProvider";
import { TextPage } from "../components/layout/TextPage";

export function TermsPage() {
  const { config } = useAppConfig();
  return (
    <TextPage title="Terms of Service">
      <p>
        You may use Solva to remove the background from images you have the right to process. You are responsible for
        the files you upload.
      </p>
      <p>
        Do not upload unlawful content. The server rejects files that are too large, are not PNG, JPG, or WebP, or
        exceed {config.max_dimension_px} pixels on a side. Requests can also be refused when they exceed the rate
        limit.
      </p>
      <p>
        Background removal is imperfect. Solva does not guarantee that every background will be removed, or that the
        cutout will be suitable for a particular use. An account is optional. There is no credit system or payment plan. Reserved areas may later show Google ads. Those ads are separate from background removal, and the
        tool works if they never load.
      </p>
      <p>
        Results are temporary. Download anything you want to keep before the retention window of about{" "}
        {config.retention_minutes} minutes ends. The operator of the server provides the service as-is.
      </p>
    </TextPage>
  );
}
