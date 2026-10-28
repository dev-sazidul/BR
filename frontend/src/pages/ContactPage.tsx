import { useState } from "react";

import { useAppConfig } from "../app/ConfigProvider";
import { Button } from "../components/common/Button";
import { TextPage } from "../components/layout/TextPage";

export function ContactPage() {
  const { status, config } = useAppConfig();
  const [copied, setCopied] = useState(false);
  const email = config.contact_email;

  async function copyEmail() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <TextPage title="Contact">
      {status === "loading" ? <p>Loading contact details…</p> : null}
      {status !== "loading" && email ? (
        <>
          <p>
            Email the operator of this server at{" "}
            <a className="font-medium text-brand underline" href={`mailto:${email}`}>
              {email}
            </a>
            .
          </p>
          <Button variant="secondary" onClick={() => void copyEmail()}>
            {copied ? "Copied" : "Copy email"}
          </Button>
        </>
      ) : null}
      {status !== "loading" && !email ? (
        <p>
          A contact email has not been published for this server. The operator can set one with the CONTACT_EMAIL
          environment variable.
        </p>
      ) : null}
    </TextPage>
  );
}
