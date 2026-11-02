import { Suspense } from "react";

import { ResetPasswordPage } from "../../src/views/ResetPasswordPage";
import { JsonLd } from "../../src/seo/JsonLd";
import { metadataFor } from "../../src/seo/next-metadata";

export const metadata = metadataFor("/reset-password");
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <JsonLd path="/reset-password" />
      <Suspense fallback={null}>
        <ResetPasswordPage />
      </Suspense>
    </>
  );
}
