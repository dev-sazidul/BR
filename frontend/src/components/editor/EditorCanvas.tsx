import { useEffect, useRef, useState } from "react";

import type { CropNorm, EditorSnapshot } from "../../types/editor";
import { cn } from "../../utils/cn";
import { paintComposition } from "../../utils/imageComposition";
import { fittedSize } from "../../utils/imageGeometry";
import { Button } from "../common/Button";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { CropOverlay } from "./CropTool";

type EditorCanvasProps = {
  originalUrl: string;
  foreground: HTMLImageElement;
  backgroundImage: HTMLImageElement | null;
  snapshot: EditorSnapshot;
  zoom: number;
  comparing: boolean;
  cropping: boolean;
  draft: CropNorm | null;
  cropRatio: number | null;
  rotatedFrame: { width: number; height: number } | null;
  onZoom: (zoom: number) => void;
  onDraft: (crop: CropNorm) => void;
};

const PREVIEW_EDGE = 1100;

export function EditorCanvas({
  originalUrl,
  foreground,
  backgroundImage,
  snapshot,
  zoom,
  comparing,
  cropping,
  draft,
  cropRatio,
  rotatedFrame,
  onZoom,
  onDraft,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const transparent = snapshot.background.type === "transparent";
  const logical =
    cropping && rotatedFrame
      ? fittedSize(rotatedFrame.width, rotatedFrame.height, PREVIEW_EDGE)
      : fittedSize(snapshot.width, snapshot.height, PREVIEW_EDGE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paintSnapshot = cropping ? { ...snapshot, crop: null, lockAspect: true as const } : snapshot;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(logical.width * scale));
    canvas.height = Math.max(1, Math.round(logical.height * scale));
    canvas.style.width = `${logical.width}px`;
    canvas.style.height = `${logical.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintComposition(ctx, {
      foreground: { width: foreground.naturalWidth, height: foreground.naturalHeight, source: foreground },
      backgroundImage: backgroundImage
        ? { width: backgroundImage.naturalWidth, height: backgroundImage.naturalHeight, source: backgroundImage }
        : null,
      snapshot: paintSnapshot,
      includeBackground: paintSnapshot.background.type !== "transparent",
      underlay: null,
      destWidth: logical.width,
      destHeight: logical.height,
      scale,
      maxRasterEdge: 1600,
    });
    if (!comparing) {
      setPreviewUrl(null);
      return;
    }
    try {
      setPreviewUrl(canvas.toDataURL("image/png"));
    } catch {
      setPreviewUrl(null);
    }
  }, [backgroundImage, comparing, cropping, foreground, logical.height, logical.width, snapshot]);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" aria-label="Zoom out" onClick={() => onZoom(Math.max(0.5, zoom - 0.25))}>
          −
        </Button>
        <span className="min-w-14 text-center text-sm font-medium" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="secondary" aria-label="Zoom in" onClick={() => onZoom(Math.min(3, zoom + 0.25))}>
          +
        </Button>
        <Button variant="ghost" onClick={() => onZoom(1)}>
          Fit
        </Button>
      </div>
      <div className="overflow-auto rounded-2xl border border-line bg-paper p-4">
        <div
          className={cn(
            "relative mx-auto",
            comparing && previewUrl ? "hidden" : transparent ? "checkerboard" : "bg-white",
          )}
          style={
            comparing
              ? undefined
              : {
                  width: logical.width * zoom,
                  height: logical.height * zoom,
                }
          }
        >
          <div
            className="relative"
            style={
              comparing
                ? undefined
                : { width: logical.width, height: logical.height, transform: `scale(${zoom})`, transformOrigin: "top left" }
            }
          >
            <canvas ref={canvasRef} role="img" aria-label="Edited preview" className="block max-w-none" />
            {cropping && !comparing && draft && rotatedFrame ? (
              <CropOverlay crop={draft} bounds={rotatedFrame} ratio={cropRatio} onChange={onDraft} />
            ) : null}
          </div>
        </div>
        {comparing && previewUrl ? <BeforeAfterSlider before={originalUrl} after={previewUrl} /> : null}
      </div>
    </div>
  );
}
