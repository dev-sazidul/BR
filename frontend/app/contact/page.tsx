import { ContactPage } from "../../src/views/ContactPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/contact");

export default function Page() {
  return (
    <>
      <JsonLd path="/contact" />
      <ContactPage />
    </>
  );
}
