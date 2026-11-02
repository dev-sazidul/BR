import { ForgotPasswordPage } from "../../src/views/ForgotPasswordPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/forgot-password");

export default function Page() {
  return (
    <>
      <JsonLd path="/forgot-password" />
      <ForgotPasswordPage />
    </>
  );
}
