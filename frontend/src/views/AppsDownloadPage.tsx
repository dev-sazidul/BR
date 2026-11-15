"use client";

import { useEffect, useState } from "react";

import { Button } from "../components/common/Button";
import { clearInstallPrompt, getInstallPrompt, wasInstalled } from "../pwa/install-prompt";
import { detectInstallPlatform, isInAppBrowser, isStandaloneDisplay, type InstallPlatform } from "../pwa/platform";

export function AppsDownloadPage() {
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [inApp, setInApp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const sync = () => {
      const ua = navigator.userAgent;
      setPlatform(
        detectInstallPlatform({
          userAgent: ua,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
        }),
      );
      setInApp(isInAppBrowser(ua));
      setStandalone(
        isStandaloneDisplay({
          mediaStandalone: window.matchMedia("(display-mode: standalone)").matches,
          navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
        }),
      );
      setCanInstall(getInstallPrompt() !== null);
      setInstalled(wasInstalled());
    };
    sync();
    window.addEventListener("solva-install-prompt", sync);
    return () => window.removeEventListener("solva-install-prompt", sync);
  }, []);

  async function install() {
    const prompt = getInstallPrompt();
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      clearInstallPrompt();
    } catch {
      clearInstallPrompt();
    } finally {
      setInstalling(false);
    }
  }

  const showInstall = canInstall && !standalone && platform !== "ios";

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Install Solva</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Add Solva to your home screen or desktop. It uses the browser’s own install prompt. There is no separate app
        store file.
      </p>

      {standalone || installed ? (
        <p className="mt-6 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink" role="status">
          {standalone
            ? "You are using the installed Solva app."
            : "Solva was added to this device."}
        </p>
      ) : null}

      {inApp && !standalone ? (
        <p className="mt-6 text-sm leading-6 text-muted">
          This browser cannot install Solva. Open imagecustomize.site in Safari on iPhone or iPad, or in Chrome or Edge
          on Android and desktop.
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Android</h2>
        {platform === "android" && showInstall ? (
          <Button className="mt-4" onClick={() => void install()} disabled={installing}>
            {installing ? "Waiting for the browser…" : "Install App"}
          </Button>
        ) : null}
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-7 text-muted">
          <li>Open this site in Chrome.</li>
          <li>Tap the menu, then Install app or Add to Home screen.</li>
          <li>Confirm. Solva opens in its own window.</li>
        </ol>
        {platform === "android" && !showInstall && !standalone ? (
          <p className="mt-3 text-sm text-muted">The install prompt is not available in this browser, so use the steps above.</p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">iPhone and iPad</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-7 text-muted">
          <li>Open the website in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Select Add to Home Screen.</li>
          <li>Tap Add.</li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Desktop</h2>
        {platform === "desktop" && showInstall ? (
          <Button className="mt-4" onClick={() => void install()} disabled={installing}>
            {installing ? "Waiting for the browser…" : "Install App"}
          </Button>
        ) : null}
        <div className="mt-4 space-y-3 text-base leading-7 text-muted">
          <p>Chrome and Edge on Windows, macOS, and Linux show an install icon in the address bar when the app is ready. You can also open the browser menu and choose Install Solva.</p>
          <p>In Safari on macOS, use Share, then Add to Dock.</p>
          <p>Firefox does not install this app. Use Chrome or Edge there.</p>
        </div>
        {platform === "desktop" && !showInstall && !standalone ? (
          <p className="mt-3 text-sm text-muted">The install prompt is not available right now, so use the browser menu.</p>
        ) : null}
      </section>
    </article>
  );
}
