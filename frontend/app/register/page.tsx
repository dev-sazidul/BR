import { RegisterPage } from "../../src/views/RegisterPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/register");

export default function Page() {
  return (
    <>
      <JsonLd path="/register" />
      <RegisterPage />
    </>
  );
}
