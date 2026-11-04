"use client";

import { readAdSettings } from "../ads/adConfig";
import { useAdConsent } from "../ads/consent";
import { Button } from "../components/common/Button";
import { TextPage } from "../components/layout/TextPage";

export function PrivacyPage() {
  const ads = readAdSettings();
  const consent = useAdConsent();

  return (
    <TextPage title="Privacy">
      <p>
        Solva does not require an account. If you create one, the server stores your name, email, and a hashed
        password. It does not store your password itself, and it does not attach uploads to your account. A removal
        request includes the image you upload and, on the server, a log line with the time, result size, and processing
        outcome. The log does not include the image itself.
      </p>
      <p>
        The image is processed in memory and is not saved, and neither is the transparent result. The result is sent
        straight back to your browser, which keeps it only until you leave or reload the page.
      </p>
      <p>
        Background removal runs on servers run by the operator of this site. The image is not sent to a third-party AI
        service.
      </p>
      <p>
        Signing in sets two cookies. One holds your session and cannot be read by scripts on the page. The other only
        says that a session may exist, so the page knows whether to check. Signing out removes both.
      </p>
      <p>
        Rate limiting uses your IP address. If the server is behind a trusted proxy, it uses the forwarding header
        that proxy sets. Do not upload images you are not allowed to share with the operator of this server.
      </p>
      <p>
        Reserved areas on the page can show Google AdSense after the operator adds a publisher ID. Solva loads the
        AdSense script only then, and only after you allow it when consent is required. Until that happens, those
        areas stay empty. AdSense may store cookies. Google describes what that script collects.
      </p>
      <p>
        The choice is saved in this browser only. It is not a Google-certified consent platform. An operator who
        serves ads in the EEA, the UK, or Switzerland needs a certified platform as well. Background removal works
        the same if you decline ads or if the script never loads.
      </p>
      {ads.clientValid ? (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="secondary" onClick={consent.grant}>
            Allow ads in this browser
          </Button>
          <Button variant="ghost" onClick={consent.deny}>
            Keep ads off
          </Button>
        </div>
      ) : (
        <p>Advertising is not configured on this server.</p>
      )}
    </TextPage>
  );
}
