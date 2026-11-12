import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";
import { AppsDownloadPage } from "../../src/views/AppsDownloadPage";

export const metadata = metadataFor("/apps");

export default function Page() {
  return (
    <>
      <JsonLd path="/apps" />
      <AppsDownloadPage />
    </>
  );
}
