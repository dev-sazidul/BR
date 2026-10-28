import { readAdSettings } from "../../ads/adConfig";
import { useAdConsent } from "../../ads/consent";
import { Button } from "../common/Button";

export function AdConsentNotice() {
  const settings = readAdSettings();
  const consent = useAdConsent();

  if (!settings.active || !settings.clientValid || !settings.requireConsent || consent.status !== "unknown") {
    return null;
  }

  return (
    <section
      className="mx-auto w-full min-w-0 max-w-6xl px-5 pt-4"
      aria-label="Advertising consent"
    >
      <div className="rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-muted">
        <p>
          Google AdSense can use cookies. Solva does not load that script until you allow it. The choice stays in this
          browser. Removing a background does not require it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={consent.grant}>
            Allow ads
          </Button>
          <Button variant="ghost" onClick={consent.deny}>
            Not now
          </Button>
        </div>
      </div>
    </section>
  );
}
