import { PrivacyPage } from "../../src/views/PrivacyPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/privacy");

export default function Page() {
  return (
    <>
      <JsonLd path="/privacy" />
      <PrivacyPage />
    </>
  );
}
