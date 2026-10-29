import type { BackgroundSelection, EditorSnapshot, ShadowSettings } from "../types/editor";
import { backgroundPlacement, clamp, containedRect, cropPixels, rotatedBounds } from "./imageGeometry";

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
  if (includeBackground && snapshot.shadow?.enabled) {
    paintContactShadow(ctx, offscreen, crop, place, snapshot.shadow, destHeight / Math.max(1, snapshot.height), createCanvas);
  }
  const canMatch = snapshot.background.type === "color" || snapshot.background.type === "gradient" || backgroundImage !== null;
  if (snapshot.matchScene && includeBackground && canMatch) {
    matchSceneLighting(offCtx, offscreen, ctx.canvas, snapshot.background.type === "image", createCanvas);
  }
  ctx.drawImage(offscreen, crop.x, crop.y, crop.width, crop.height, place.x, place.y, place.width, place.height);
}

type Tone = { r: number; g: number; b: number; luma: number };

export function shadowStrength(intensity: number, backgroundLuma: number): number {
  const lift = clamp(backgroundLuma, 0.15, 1);
  return clamp(intensity * (0.2 + 0.45 * lift), 0, 0.42);
}

export function lightingScale(foregroundLuma: number, backgroundLuma: number): number {
  if (foregroundLuma < 0.04) return 1;
  return clamp(backgroundLuma / foregroundLuma, 0.94, 1.06);
}

function paintContactShadow(
  ctx: CanvasRenderingContext2D,
  subject: HTMLCanvasElement,
  crop: { x: number; y: number; width: number; height: number },
  place: { x: number; y: number; width: number; height: number },
  shadow: ShadowSettings,
  outputScale: number,
  createCanvas: (width: number, height: number) => HTMLCanvasElement,
): void {
  const width = Math.max(1, Math.round(place.width));
  const height = Math.max(1, Math.round(place.height));
  const mask = createCanvas(width, height);
  const maskCtx = mask.getContext("2d");
  if (!maskCtx || typeof maskCtx.filter !== "string") return;
  maskCtx.drawImage(subject, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.fillStyle = "#000000";
  maskCtx.fillRect(0, 0, width, height);

  const luma = averageTone(ctx.canvas, createCanvas, false)?.luma ?? 0.6;
  const opacity = shadowStrength(shadow.intensity, luma);
  if (opacity <= 0.01) return;
  const blur = Math.max(0, shadow.blur * outputScale);
  const distance = shadow.distance * outputScale;
  const rad = (shadow.angle * Math.PI) / 180;
  const dx = Math.cos(rad) * distance;
  const dy = Math.sin(rad) * distance;
  const band = Math.max(2, height * 0.22);
  const flat = Math.max(2, band * 0.32);
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = opacity;
  ctx.drawImage(mask, 0, height - band, width, band, place.x + dx, place.y + height - flat + dy, width, flat);
  ctx.restore();
}

function matchSceneLighting(
  subjectCtx: CanvasRenderingContext2D,
  subject: HTMLCanvasElement,
  backdrop: HTMLCanvasElement,
  allowTemperature: boolean,
  createCanvas: (width: number, height: number) => HTMLCanvasElement,
): void {
  if (!subjectCtx.getImageData || !subjectCtx.putImageData) return;
  const foreground = averageTone(subject, createCanvas, true);
  const background = averageTone(backdrop, createCanvas, false);
  if (!foreground || !background) return;
  const scale = lightingScale(foreground.luma, background.luma);
  const warm = allowTemperature ? clamp((background.r - background.b) - (foreground.r - foreground.b), -24, 24) * 0.12 : 0;
  if (Math.abs(scale - 1) < 0.01 && Math.abs(warm) < 0.4) return;
  const frame = subjectCtx.getImageData(0, 0, subject.width, subject.height);
  const pixels = frame.data;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 8) continue;
    pixels[index] = clamp(pixels[index] * scale + warm, 0, 255);
    pixels[index + 1] = clamp(pixels[index + 1] * scale, 0, 255);
    pixels[index + 2] = clamp(pixels[index + 2] * scale - warm, 0, 255);
  }
  subjectCtx.putImageData(frame, 0, 0);
}

function averageTone(
  source: CanvasImageSource,
  createCanvas: (width: number, height: number) => HTMLCanvasElement,
  opaqueOnly: boolean,
): Tone | null {
  const sample = createCanvas(24, 24);
  const ctx = sample.getContext("2d");
  if (!ctx?.getImageData) return null;
  ctx.drawImage(source, 0, 0, 24, 24);
  const pixels = ctx.getImageData(0, 0, 24, 24).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (opaqueOnly && pixels[index + 3] < 200) continue;
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    count += 1;
  }
  if (!count) return null;
  const r = red / count;
  const g = green / count;
  const b = blue / count;
  return { r, g, b, luma: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
}
