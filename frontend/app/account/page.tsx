import { AccountSettingsPage } from "../../src/views/AccountSettingsPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/account");

export default function Page() {
  return (
    <>
      <JsonLd path="/account" />
      <AccountSettingsPage />
    </>
  );
}
