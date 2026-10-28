import { ImageUp } from "lucide-react";
import { useRef } from "react";

import { buttonClass } from "../common/Button";
import { FILE_ACCEPT } from "../../utils/validateFile";

type DropzoneProps = {
  hint: string;
  disabled?: boolean;
  onFile: (file: File) => void;
};

export function Dropzone({ hint, disabled = false, onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function takeFile(file: File | undefined) {
    if (!file || disabled) return;
    onFile(file);
  }

  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-white px-6 py-12 text-center shadow-card transition-colors focus-within:border-brand focus-within:bg-brand-soft/40"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) event.currentTarget.classList.add("border-brand", "bg-brand-soft/50");
      }}
      onDragLeave={(event) => {
        event.currentTarget.classList.remove("border-brand", "bg-brand-soft/50");
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.currentTarget.classList.remove("border-brand", "bg-brand-soft/50");
        const files = Array.from(event.dataTransfer.files);
        takeFile(files[0]);
      }}
    >
      <input
        ref={inputRef}
        id="image-upload"
        className="sr-only"
        type="file"
        accept={FILE_ACCEPT}
        tabIndex={-1}
        aria-label="Choose an image"
        disabled={disabled}
        onChange={(event) => {
          takeFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <ImageUp aria-hidden="true" />
      </span>
      <p className="mt-5 text-lg font-semibold">Drag an image here</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{hint}</p>
      <button
        type="button"
        className={buttonClass("primary", "mt-6")}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Browse image
      </button>
    </div>
  );
}
