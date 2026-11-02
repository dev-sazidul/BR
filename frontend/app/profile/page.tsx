import { ProfilePage } from "../../src/views/ProfilePage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/profile");

export default function Page() {
  return (
    <>
      <JsonLd path="/profile" />
      <ProfilePage />
    </>
  );
}
