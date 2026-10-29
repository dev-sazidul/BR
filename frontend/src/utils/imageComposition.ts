import type { BackgroundSelection, EditorSnapshot } from "../types/editor";
import { backgroundPlacement, containedRect, cropPixels, rotatedBounds } from "./imageGeometry";

export type Drawable = {
  width: number;
  height: number;
  source: CanvasImageSource;
};

export type CompositionInput = {
  foreground: Drawable;
  backgroundImage: Drawable | null;
  snapshot: EditorSnapshot;
  includeBackground: boolean;
  underlay: string | null;
  destWidth: number;
  destHeight: number;
  scale: number;
  maxRasterEdge?: number;
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
};

function defaultCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  background: BackgroundSelection,
  backgroundImage: Drawable | null,
  destWidth: number,
  destHeight: number,
): void {
  if (background.type === "transparent") return;
  if (background.type === "color") {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, destWidth, destHeight);
    return;
  }
  if (background.type === "gradient") {
    const rad = (background.angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = Math.hypot(destWidth, destHeight) / 2;
    const gradient = ctx.createLinearGradient(
      destWidth / 2 - dx * half,
      destHeight / 2 - dy * half,
      destWidth / 2 + dx * half,
      destHeight / 2 + dy * half,
    );
    background.stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, destWidth, destHeight);
    return;
  }
  if (!backgroundImage) return;
  const place = backgroundPlacement(
    backgroundImage.width,
    backgroundImage.height,
    destWidth,
    destHeight,
    background.fit,
    background.scale,
    background.offsetX,
    background.offsetY,
  );
  ctx.drawImage(backgroundImage.source, place.x, place.y, place.width, place.height);
}

export function paintComposition(ctx: CanvasRenderingContext2D, input: CompositionInput): void {
  const { foreground, backgroundImage, snapshot, includeBackground, underlay, destWidth, destHeight, scale } = input;
  const createCanvas = input.createCanvas ?? defaultCanvas;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, destWidth, destHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (underlay) {
    ctx.fillStyle = underlay;
    ctx.fillRect(0, 0, destWidth, destHeight);
  }
  if (includeBackground) paintBackground(ctx, snapshot.background, backgroundImage, destWidth, destHeight);

  const bounds = rotatedBounds(foreground.width, foreground.height, snapshot.rotation);
  const rawWidth = Math.max(1, Math.ceil(bounds.width));
  const rawHeight = Math.max(1, Math.ceil(bounds.height));
  const raster = Math.min(1, (input.maxRasterEdge ?? Math.max(rawWidth, rawHeight)) / Math.max(rawWidth, rawHeight));
  const offWidth = Math.max(1, Math.round(rawWidth * raster));
  const offHeight = Math.max(1, Math.round(rawHeight * raster));
  const offscreen = createCanvas(offWidth, offHeight);
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  offCtx.setTransform(1, 0, 0, 1, 0, 0);
  offCtx.clearRect(0, 0, offWidth, offHeight);
  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = "high";
  offCtx.translate(offWidth / 2, offHeight / 2);
  offCtx.rotate((snapshot.rotation * Math.PI) / 180);
  offCtx.scale(raster, raster);
  offCtx.drawImage(foreground.source, -foreground.width / 2, -foreground.height / 2, foreground.width, foreground.height);

  const crop = cropPixels({ width: offWidth, height: offHeight }, snapshot.crop);
  const place = snapshot.lockAspect
    ? { x: 0, y: 0, width: destWidth, height: destHeight }
    : containedRect(crop.width, crop.height, destWidth, destHeight);
  ctx.drawImage(offscreen, crop.x, crop.y, crop.width, crop.height, place.x, place.y, place.width, place.height);
}
