import { resolvePageMeta } from "./metadata";
import { getSiteOrigin } from "./siteConfig";

export function JsonLd({ path }: { path: string }) {
  const origin = getSiteOrigin();
  const meta = resolvePageMeta(path, origin);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(meta.jsonLd) }}
    />
  );
}
