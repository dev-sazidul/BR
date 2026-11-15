import { BlogIndexPage } from "../../src/views/BlogIndexPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/blog");

export default function Page() {
  return (
    <>
      <JsonLd path="/blog" />
      <BlogIndexPage />
    </>
  );
}

