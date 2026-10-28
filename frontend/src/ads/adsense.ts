import { isValidClientId } from "./adConfig";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const SCRIPT_MARK = "data-solva-adsense";
const SCRIPT_HOST = "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

let pending: Promise<void> | null = null;

function existingScript(): HTMLScriptElement | null {
  return document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARK}], script[src*="${SCRIPT_HOST}"]`);
}

export function loadAdSense(clientId: string): Promise<void> {
  if (!isValidClientId(clientId)) {
    return Promise.reject(new Error("AdSense publisher ID is missing or not a ca-pub ID."));
  }
  if (pending) return pending;

  const existing = existingScript();
  if (existing) {
    pending = Promise.resolve();
    return pending;
  }

  pending = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://${SCRIPT_HOST}?client=${encodeURIComponent(clientId)}`;
    script.crossOrigin = "anonymous";
    script.setAttribute(SCRIPT_MARK, "true");
    script.dataset.adClient = clientId;
    script.onload = () => resolve();
    script.onerror = () => {
      pending = null;
      script.remove();
      reject(new Error("AdSense script failed to load."));
    };
    document.head.appendChild(script);
  });

  return pending;
}

export function resetAdSenseLoaderForTests(): void {
  pending = null;
  document.querySelectorAll(`script[${SCRIPT_MARK}]`).forEach((node) => node.remove());
}
