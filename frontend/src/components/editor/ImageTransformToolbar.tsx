import { Download, Redo2, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "../common/Button";
import { Spinner } from "../common/Spinner";

type ImageTransformToolbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  comparing: boolean;
  exporting: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onCompare: () => void;
  onDownload: () => void;
  onClose: () => void;
};

export function ImageTransformToolbar({
  canUndo,
  canRedo,
  comparing,
  exporting,
  onUndo,
  onRedo,
  onReset,
  onCompare,
  onDownload,
  onClose,
}: ImageTransformToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
        <Undo2 aria-hidden="true" size={16} />
        Undo
      </Button>
      <Button variant="secondary" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
        <Redo2 aria-hidden="true" size={16} />
        Redo
      </Button>
      <Button variant="secondary" onClick={onReset}>
        <RotateCcw aria-hidden="true" size={16} />
        Reset
      </Button>
      <Button variant="secondary" aria-pressed={comparing} onClick={onCompare}>
        {comparing ? "Editing" : "Compare"}
      </Button>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button onClick={onDownload} disabled={exporting}>
          {exporting ? <Spinner /> : <Download aria-hidden="true" size={16} />}
          Download
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Close editor
        </Button>
      </div>
    </div>
  );
}
