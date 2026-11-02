import { NotFoundPage } from "../src/views/NotFoundPage";
import { JsonLd } from "../src/seo/JsonLd";
import { metadataFor } from "../src/seo/next-metadata";

export const metadata = metadataFor("/404");

export default function NotFound() {
  return (
    <>
      <JsonLd path="/404" />
      <NotFoundPage />
    </>
  );
}
