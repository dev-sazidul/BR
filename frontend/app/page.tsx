import { HomePage } from "../src/views/HomePage";
import { JsonLd } from "../src/seo/JsonLd";
import { metadataFor } from "../src/seo/next-metadata";

export const metadata = metadataFor("/");

export default function Page() {
  return (
    <>
      <JsonLd path="/" />
      <HomePage />
    </>
  );
}
