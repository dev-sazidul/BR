import { useRef, useState } from "react";

import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { FILE_ACCEPT } from "../../utils/validateFile";

type CustomBackgroundUploaderProps = {
  previewUrl: string | null;
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
};

export function CustomBackgroundUploader({ previewUrl, error, onFile, onRemove }: CustomBackgroundUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function take(file: File | undefined) {
    if (file) onFile(file);
  }

  return (
    <div>
      <div
        className={`rounded-2xl border-2 border-dashed px-4 py-5 text-center ${dragging ? "border-brand bg-brand-soft/40" : "border-line bg-paper"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files[0]);
        }}
      >
        <p className="text-sm font-medium">Upload background</p>
        <p className="mt-1 text-xs leading-5 text-muted">PNG, JPG, or WebP. It stays on this device.</p>
        {previewUrl ? (
          <img src={previewUrl} alt="Uploaded background preview" className="mx-auto mt-3 h-20 w-full rounded-lg object-cover" />
        ) : null}
        <Button className="mt-3" onClick={() => inputRef.current?.click()}>
          {previewUrl ? "Replace background" : "Upload background"}
        </Button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={FILE_ACCEPT}
          aria-label="Background image"
          onChange={(event) => {
            take(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {previewUrl ? (
        <Button variant="ghost" className="mt-2 w-full" onClick={onRemove}>
          Remove background image
        </Button>
      ) : null}
      {error ? (
        <div className="mt-3">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      ) : null}
    </div>
  );
}
