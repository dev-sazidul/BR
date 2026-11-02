import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { BackgroundPicker } from "./BackgroundPicker";
import { ComparisonSlider } from "./ComparisonSlider";
import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { Spinner } from "../common/Spinner";
import type { RemovalPhase } from "../../hooks/useBackgroundRemoval";
import type { RemovalResult } from "../../types/api";
import { cn } from "../../utils/cn";
import { formatExpiry } from "../../utils/download";
import { FILE_ACCEPT } from "../../utils/validateFile";

const AdvancedImageEditor = lazy(() =>
  import("../editor/AdvancedImageEditor").then((module) => ({ default: module.AdvancedImageEditor })),
);

type WorkspaceProps = {
  fileName: string;
  originalUrl: string | null;
  resultUrl: string | null;
  meta: RemovalResult | null;
  phase: RemovalPhase;
  error: string | null;
  uploadProgress: number | null;
  busy: boolean;
  jpgBusy: boolean;
  modelHint: string | null;
  onRetry: () => void;
  onReset: () => void;
  onReplace: (file: File) => void;
  onDownloadPng: () => void;
  onDownloadJpg: (background: string) => void;
  maxUploadBytes: number;
};

export function Workspace({
  fileName,
  originalUrl,
  resultUrl,
  meta,
  phase,
  error,
  uploadProgress,
  busy,
  jpgBusy,
  modelHint,
  onRetry,
  onReset,
  onReplace,
  onDownloadPng,
  onDownloadJpg,
  maxUploadBytes,
}: WorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"split" | "slider">("split");
  const [background, setBackground] = useState<string | null>(null);
  const [custom, setCustom] = useState("#F4EDE4");
  const [editorOpen, setEditorOpen] = useState(false);
  const expiry = meta ? formatExpiry(meta.expires_at) : null;
  const jpgColor = background ?? "#FFFFFF";

  useEffect(() => {
    setEditorOpen(false);
  }, [resultUrl]);

  return (
    <div className="rise rounded-3xl border border-line bg-white p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Your image</h2>
          <p className="mt-1 break-words text-sm text-muted">
            {fileName}
            {meta ? ` · ${meta.width}×${meta.height}` : ""}
          </p>
        </div>
        {resultUrl && !editorOpen ? (
          <div className="inline-flex max-w-full flex-wrap rounded-full border border-line p-1" role="group" aria-label="Preview layout">
            <ViewButton pressed={view === "split"} onClick={() => setView("split")}>
              Side by side
            </ViewButton>
            <ViewButton pressed={view === "slider"} onClick={() => setView("slider")}>
              Slider
            </ViewButton>
            <ViewButton pressed={false} onClick={() => setEditorOpen(true)}>
              Edit image
            </ViewButton>
          </div>
        ) : null}
      </div>

      {busy ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-dark">
          <Spinner />
          {statusCopy(phase, meta, uploadProgress)}
        </p>
      ) : null}
      {modelHint && busy ? <p className="mt-2 text-sm text-muted">{modelHint}</p> : null}
      {error ? (
        <div className="mt-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      ) : null}

      <div className="mt-5">
        {resultUrl && originalUrl && editorOpen ? (
          <Suspense
            fallback={
              <p role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm font-medium text-brand-dark">
                <Spinner />
                Opening the editor…
              </p>
            }
          >
            <AdvancedImageEditor
              originalUrl={originalUrl}
              foregroundUrl={resultUrl}
              fileName={fileName}
              maxBytes={maxUploadBytes}
              onClose={() => setEditorOpen(false)}
            />
          </Suspense>
        ) : resultUrl && originalUrl && view === "slider" ? (
          <ComparisonSlider before={originalUrl} after={resultUrl} background={background} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <PreviewFigure label="Original" src={originalUrl} alt="Selected image" />
            {resultUrl ? (
              <PreviewFigure
                label="Transparent PNG"
                src={resultUrl}
                alt="Background removed"
                background={background}
              />
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-line px-6 text-center text-sm text-muted">
                The cutout will appear here when processing finishes.
              </div>
            )}
          </div>
        )}
      </div>

      {resultUrl && !editorOpen ? (
        <div className="mt-5">
          <BackgroundPicker
            value={background}
            custom={custom}
            disabled={busy}
            onChange={setBackground}
            onCustom={setCustom}
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {!editorOpen ? (
          <Button onClick={onDownloadPng} disabled={!resultUrl || busy}>
            Download PNG
          </Button>
        ) : null}
        {!editorOpen ? (
          <Button
            variant="secondary"
            disabled={!resultUrl || busy || jpgBusy}
            onClick={() => onDownloadJpg(jpgColor)}
          >
            {jpgBusy ? <Spinner /> : null}
            {background ? "Download JPG" : "Download JPG on white"}
          </Button>
        ) : null}
        <Button variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          Upload another
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onReset}>
          Start over
        </Button>
        {phase === "error" ? (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
      {expiry ? <p className="mt-3 text-sm text-muted">This download stays available until {expiry}.</p> : null}
      <p className="mt-2 text-sm text-muted">Edges around hair, glass, and fine detail can still need a manual touch.</p>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={FILE_ACCEPT}
        tabIndex={-1}
        aria-label="Upload another image"
        disabled={busy}
        onChange={(event) => {
          const next = event.target.files?.[0];
          event.target.value = "";
          if (!next) return;
          onReplace(next);
        }}
      />
    </div>
  );
}

function PreviewFigure({
  label,
  src,
  alt,
  background = null,
}: {
  label: string;
  src: string | null;
  alt: string;
  background?: string | null;
}) {
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-medium">{label}</figcaption>
      <div
        className={cn(
          "flex min-h-48 items-center justify-center overflow-hidden rounded-2xl border border-line",
          background ? "" : label === "Original" ? "bg-paper" : "checkerboard",
        )}
        style={background ? { backgroundColor: background } : undefined}
      >
        {src ? <img src={src} alt={alt} className="max-h-[420px] w-full object-contain" /> : null}
      </div>
    </figure>
  );
}

function ViewButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${pressed ? "bg-ink text-white" : "text-muted"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function statusCopy(phase: RemovalPhase, meta: RemovalResult | null, uploadProgress: number | null): string {
  if (phase === "processing" && meta) return "Preparing preview…";
  if (phase === "processing") return "Removing background…";
  if (uploadProgress !== null && uploadProgress < 1) {
    return `Uploading and removing the background… ${Math.round(uploadProgress * 100)}% uploaded`;
  }
  return "Uploading and removing the background…";
}
