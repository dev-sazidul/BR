import { PortraitPage } from "../../src/views/PortraitPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/portrait");

export default function Page() {
  return (
    <>
      <JsonLd path="/portrait" />
      <PortraitPage />
    </>
  );
}
