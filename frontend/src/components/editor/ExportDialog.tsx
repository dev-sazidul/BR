import { useState } from "react";

import type { ExportFormat, ExportMode } from "../../types/editor";
import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { Spinner } from "../common/Spinner";

type ExportDialogProps = {
  transparent: boolean;
  width: number;
  height: number;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onExport: (format: ExportFormat, mode: ExportMode) => void;
};

const OPTIONS: Array<{ format: ExportFormat; mode: ExportMode; label: string; detail: string }> = [
  { format: "png", mode: "transparent", label: "PNG (transparent)", detail: "Keeps the cutout alpha channel." },
  { format: "png", mode: "background", label: "PNG with background", detail: "Flattens the selected background into the file." },
  { format: "jpeg", mode: "background", label: "JPG", detail: "Flattens onto the selected background, or white." },
  { format: "webp", mode: "transparent", label: "WebP", detail: "Uses transparency when the background is transparent." },
];

export function ExportDialog({ transparent, width, height, busy, error, onClose, onExport }: ExportDialogProps) {
  const [choice, setChoice] = useState(0);
  const selected = OPTIONS[choice];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 px-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="export-title"
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="export-title" className="text-lg font-semibold">
          Download
        </h2>
        <p className="mt-1 text-sm text-muted">
          {width}×{height} pixels. The file is the composed image, not a picture of the page.
        </p>
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Export format</legend>
          {OPTIONS.map((option, index) => (
            <label key={option.label} className="flex cursor-pointer gap-3 rounded-2xl border border-line px-3 py-2">
              <input
                type="radio"
                name="export-format"
                checked={choice === index}
                onChange={() => setChoice(index)}
              />
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs leading-5 text-muted">{option.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {transparent && selected.mode === "background" && selected.format === "png" ? (
          <p className="mt-3 text-sm text-muted">Transparent is selected, so this PNG is flattened on white.</p>
        ) : null}
        {error ? (
          <div className="mt-3">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              onExport(
                selected.format,
                selected.format === "webp" ? (transparent ? "transparent" : "background") : selected.mode,
              )
            }
          >
            {busy ? <Spinner /> : null}
            Download image
          </Button>
        </div>
      </div>
    </div>
  );
}
