import { SignInPage } from "../../src/views/SignInPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/sign-in");

export default function Page() {
  return (
    <>
      <JsonLd path="/sign-in" />
      <SignInPage />
    </>
  );
}
