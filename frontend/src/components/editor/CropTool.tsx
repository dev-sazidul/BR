import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { AspectId, CropNorm } from "../../types/editor";
import { cn } from "../../utils/cn";
import { moveCrop, resizeCrop } from "../../utils/imageGeometry";
import { Button } from "../common/Button";

const ASPECTS: AspectId[] = ["free", "1:1", "4:5", "3:4", "16:9"];

type CropToolProps = {
  aspect: AspectId;
  onAspect: (aspect: AspectId) => void;
  onApply: () => void;
  onCancel: () => void;
};

export function CropTool({ aspect, onAspect, onApply, onCancel }: CropToolProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-muted">Drag the frame on the image, then apply the crop.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Crop aspect ratio">
        {ASPECTS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={aspect === item}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              aspect === item ? "border-brand bg-brand text-white" : "border-line bg-white",
            )}
            onClick={() => onAspect(item)}
          >
            {item === "free" ? "Free" : item}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={onApply}>
          Apply crop
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

type Handle = "nw" | "ne" | "sw" | "se" | "move";

export function CropOverlay({
  crop,
  bounds,
  ratio,
  onChange,
}: {
  crop: CropNorm;
  bounds: { width: number; height: number };
  ratio: number | null;
  onChange: (crop: CropNorm) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; x: number; y: number; origin: CropNorm } | null>(null);

  function start(event: ReactPointerEvent<HTMLElement>, handle: Handle) {
    const frame = frameRef.current;
    if (!frame) return;
    event.preventDefault();
    event.stopPropagation();
    frame.setPointerCapture(event.pointerId);
    drag.current = { handle, x: event.clientX, y: event.clientY, origin: crop };
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = (event.clientX - active.x) / rect.width;
    const dy = (event.clientY - active.y) / rect.height;
    onChange(
      active.handle === "move"
        ? moveCrop(active.origin, dx, dy)
        : resizeCrop(active.origin, active.handle, dx, dy, ratio, bounds),
    );
  }

  return (
    <div
      ref={frameRef}
      className="absolute inset-0 touch-none"
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-ink/40" style={{ height: `${crop.y * 100}%` }} />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/40"
        style={{ height: `${(1 - crop.y - crop.height) * 100}%` }}
      />
      <div
        className="pointer-events-none absolute bg-ink/40"
        style={{ top: `${crop.y * 100}%`, height: `${crop.height * 100}%`, left: 0, width: `${crop.x * 100}%` }}
      />
      <div
        className="pointer-events-none absolute bg-ink/40"
        style={{
          top: `${crop.y * 100}%`,
          height: `${crop.height * 100}%`,
          right: 0,
          width: `${(1 - crop.x - crop.width) * 100}%`,
        }}
      />
      <div
        role="application"
        aria-label="Crop frame"
        tabIndex={0}
        className="absolute border-2 border-white"
        style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }}
        onPointerDown={(event) => start(event, "move")}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.05 : 0.01;
          if (event.key === "ArrowLeft") onChange(moveCrop(crop, -step, 0));
          if (event.key === "ArrowRight") onChange(moveCrop(crop, step, 0));
          if (event.key === "ArrowUp") onChange(moveCrop(crop, 0, -step));
          if (event.key === "ArrowDown") onChange(moveCrop(crop, 0, step));
        }}
      >
        {(["nw", "ne", "sw", "se"] as const).map((handle) => (
          <span
            key={handle}
            className={cn(
              "absolute h-3 w-3 rounded-sm bg-white",
              handle.includes("n") ? "-top-1.5" : "-bottom-1.5",
              handle.includes("w") ? "-left-1.5" : "-right-1.5",
            )}
            onPointerDown={(event) => start(event, handle)}
          />
        ))}
      </div>
    </div>
  );
}
