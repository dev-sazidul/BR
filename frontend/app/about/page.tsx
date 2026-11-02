import { AboutPage } from "../../src/views/AboutPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/about");

export default function Page() {
  return (
    <>
      <JsonLd path="/about" />
      <AboutPage />
    </>
  );
}
