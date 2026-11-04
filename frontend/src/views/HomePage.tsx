"use client";

import { Link } from "../lib/navigation";

import { useDocumentTitle } from "../hooks/useObjectUrl";
import { useAppConfig } from "../shell/ConfigProvider";
import { useBackgroundRemoval } from "../hooks/useBackgroundRemoval";
import { Dropzone } from "../components/uploader/Dropzone";
import { Workspace } from "../components/image-preview/Workspace";
import { AdSlot } from "../components/ads/AdSlot";
import { Features } from "../components/home/Features";
import { HowItWorks } from "../components/home/HowItWorks";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { formatBytes } from "../utils/formatBytes";

export function HomePage() {
  useDocumentTitle("Home");
  const { status, config, health } = useAppConfig();
  const removal = useBackgroundRemoval(config.max_upload_bytes);
  const limit = formatBytes(config.max_upload_bytes);
  const modelHint =
    health && health.ai.available && !health.ai.model_cached
      ? "The first removal can take longer while the AI model downloads."
      : null;

  let hint = `PNG, JPG, or WebP up to ${limit}. Longest side ${config.max_dimension_px} pixels.`;
  if (status === "loading") hint = "Checking the upload limit…";
  if (status === "unavailable") {
    hint = `Upload limits could not be loaded. Until then, Solva will try the default of ${limit}.`;
  }

  return (
    <>
      <section id="remove" className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 pb-8 pt-8 sm:pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Remove Image Backgrounds in Seconds
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Drop in a photo. Solva cuts out the subject and gives you a transparent PNG you can download.
          </p>
          <p className="mt-4 text-sm font-semibold">
            <Link to="/portrait" className="text-brand hover:text-brand-dark">
              Make a portrait or passport-size photo
            </Link>
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-6xl">
          {health && !health.ai.available ? (
            <div className="mb-4">
              <ErrorBanner>
                Background removal is not available on this server yet. {health.ai.detail}
              </ErrorBanner>
            </div>
          ) : null}

          {removal.file ? (
            <Workspace
              fileName={removal.file.name}
              originalUrl={removal.originalUrl}
              resultUrl={removal.resultUrl}
              meta={removal.meta}
              phase={removal.phase}
              error={removal.error}
              uploadProgress={removal.uploadProgress}
              busy={removal.busy}
              jpgBusy={removal.jpgBusy}
              modelHint={modelHint}
              onRetry={removal.retry}
              onReset={removal.reset}
              onReplace={(file) => void removal.start(file)}
              onDownloadPng={removal.downloadPng}
              onDownloadJpg={(background) => void removal.downloadJpg(background)}
              maxUploadBytes={config.max_upload_bytes}
            />
          ) : (
            <div className="space-y-4">
              {removal.error ? <ErrorBanner>{removal.error}</ErrorBanner> : null}
              <Dropzone
                hint={hint}
                disabled={removal.busy}
                onFile={(file) => void removal.start(file)}
              />
            </div>
          )}

          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-muted">
            Your image is processed in memory and is not stored. The transparent result comes straight back to this
            page, so download it before you leave. Upload only images you are allowed to use.
          </p>
        </div>
      </section>
      <div className="py-6">
        <AdSlot placement="workspace" />
      </div>
      <HowItWorks />
      <div className="py-8">
        <AdSlot placement="midContent" />
      </div>
      <Features />
    </>
  );
}
