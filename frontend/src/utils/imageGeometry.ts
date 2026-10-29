import type { AspectId, CropNorm, EditorSnapshot } from "../types/editor";

export const MAX_OUTPUT_EDGE = 4096;
export const MIN_OUTPUT_EDGE = 1;
export const MAX_BACKGROUND_EDGE = 8192;
const MIN_CROP = 0.08;

export const ASPECT_RATIOS: Record<AspectId, number | null> = {
  free: null,
  "1:1": 1,
  "4:5": 4 / 5,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeHex(value: string): string | null {
  const raw = value.trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [r, g, b] = withHash.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toUpperCase();
  return null;
}

function snapped(value: number): number {
  if (Math.abs(value) < 1e-8) return 0;
  if (Math.abs(1 - value) < 1e-8) return 1;
  return value;
}

export function rotatedBounds(width: number, height: number, degrees: number): { width: number; height: number } {
  const rad = (degrees * Math.PI) / 180;
  const c = snapped(Math.abs(Math.cos(rad)));
  const s = snapped(Math.abs(Math.sin(rad)));
  return {
    width: width * c + height * s,
    height: width * s + height * c,
  };
}

export function wrapDegrees(value: number): number {
  let next = value % 360;
  if (next > 180) next -= 360;
  if (next < -180) next += 360;
  return Math.round(next * 10) / 10;
}

export function fittedSize(width: number, height: number, maxEdge = MAX_OUTPUT_EDGE): { width: number; height: number } {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const edge = Math.max(safeWidth, safeHeight);
  const scale = edge > maxEdge ? maxEdge / edge : 1;
  return {
    width: Math.max(MIN_OUTPUT_EDGE, Math.round(safeWidth * scale)),
    height: Math.max(MIN_OUTPUT_EDGE, Math.round(safeHeight * scale)),
  };
}

export function cropPixels(
  bounds: { width: number; height: number },
  crop: CropNorm | null,
): { x: number; y: number; width: number; height: number } {
  const frame = crop ?? { x: 0, y: 0, width: 1, height: 1 };
  const width = Math.max(1, frame.width * bounds.width);
  const height = Math.max(1, frame.height * bounds.height);
  return {
    x: clamp(frame.x * bounds.width, 0, Math.max(0, bounds.width - 1)),
    y: clamp(frame.y * bounds.height, 0, Math.max(0, bounds.height - 1)),
    width: Math.min(width, bounds.width),
    height: Math.min(height, bounds.height),
  };
}

export function outputSizeFor(
  sourceWidth: number,
  sourceHeight: number,
  rotation: number,
  crop: CropNorm | null,
): { width: number; height: number } {
  const bounds = rotatedBounds(sourceWidth, sourceHeight, rotation);
  const pixels = cropPixels(
    { width: Math.max(1, Math.ceil(bounds.width)), height: Math.max(1, Math.ceil(bounds.height)) },
    crop,
  );
  return fittedSize(pixels.width, pixels.height);
}

export function createSnapshot(width: number, height: number): EditorSnapshot {
  const size = fittedSize(width, height);
  return {
    background: { type: "transparent" },
    crop: null,
    aspect: "free",
    rotation: 0,
    width: size.width,
    height: size.height,
    lockAspect: true,
    sized: false,
    shadow: { enabled: true, intensity: 0.32, blur: 24, distance: 14, angle: 90 },
    matchScene: true,
  };
}

export function withRotation(snapshot: EditorSnapshot, sourceWidth: number, sourceHeight: number, rotation: number): EditorSnapshot {
  const next = { ...snapshot, rotation: wrapDegrees(rotation) };
  if (next.sized) return next;
  const size = outputSizeFor(sourceWidth, sourceHeight, next.rotation, next.crop);
  return { ...next, width: size.width, height: size.height };
}

export function withCrop(
  snapshot: EditorSnapshot,
  sourceWidth: number,
  sourceHeight: number,
  crop: CropNorm | null,
  aspect: AspectId,
): EditorSnapshot {
  const size = outputSizeFor(sourceWidth, sourceHeight, snapshot.rotation, crop);
  return { ...snapshot, crop, aspect, sized: false, width: size.width, height: size.height };
}

export function withSize(
  snapshot: EditorSnapshot,
  sourceWidth: number,
  sourceHeight: number,
  edge: "width" | "height",
  value: number,
): EditorSnapshot {
  const geometry = outputSizeFor(sourceWidth, sourceHeight, snapshot.rotation, snapshot.crop);
  const aspect = geometry.width / geometry.height;
  let width = snapshot.width;
  let height = snapshot.height;
  const nextValue = clamp(Math.round(value) || MIN_OUTPUT_EDGE, MIN_OUTPUT_EDGE, MAX_OUTPUT_EDGE);
  if (edge === "width") {
    width = nextValue;
    if (snapshot.lockAspect) height = Math.round(width / aspect);
  } else {
    height = nextValue;
    if (snapshot.lockAspect) width = Math.round(height * aspect);
  }
  const fitted = fittedSize(width, height);
  return { ...snapshot, width: fitted.width, height: fitted.height, sized: true };
}

export function centeredAspectCrop(bounds: { width: number; height: number }, ratio: number | null): CropNorm | null {
  if (!ratio || bounds.width <= 0 || bounds.height <= 0) return null;
  const frameRatio = bounds.width / bounds.height;
  if (frameRatio > ratio) {
    const width = ratio / frameRatio;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  const height = frameRatio / ratio;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
}

export function moveCrop(origin: CropNorm, dx: number, dy: number): CropNorm {
  return {
    ...origin,
    x: clamp(origin.x + dx, 0, 1 - origin.width),
    y: clamp(origin.y + dy, 0, 1 - origin.height),
  };
}

export function resizeCrop(
  origin: CropNorm,
  handle: "nw" | "ne" | "sw" | "se",
  dx: number,
  dy: number,
  ratio: number | null,
  bounds: { width: number; height: number },
): CropNorm {
  let x = origin.x * bounds.width;
  let y = origin.y * bounds.height;
  let w = origin.width * bounds.width;
  let h = origin.height * bounds.height;
  const right = x + w;
  const bottom = y + h;
  if (handle.includes("e")) w += dx * bounds.width;
  if (handle.includes("s")) h += dy * bounds.height;
  if (handle.includes("w")) {
    x += dx * bounds.width;
    w = right - x;
  }
  if (handle.includes("n")) {
    y += dy * bounds.height;
    h = bottom - y;
  }
  if (ratio && w > 0) {
    h = w / ratio;
    if (handle.includes("n")) y = bottom - h;
    if (handle.includes("w")) x = right - w;
  }
  w = clamp(w, bounds.width * MIN_CROP, bounds.width);
  h = clamp(h, bounds.height * MIN_CROP, bounds.height);
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > bounds.width) x = bounds.width - w;
  if (y + h > bounds.height) y = bounds.height - h;
  return {
    x: x / bounds.width,
    y: y / bounds.height,
    width: w / bounds.width,
    height: h / bounds.height,
  };
}

export function containedRect(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(destWidth / sourceWidth, destHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (destWidth - width) / 2, y: (destHeight - height) / 2, width, height };
}

export function backgroundPlacement(
  imageWidth: number,
  imageHeight: number,
  destWidth: number,
  destHeight: number,
  fit: "cover" | "contain" | "center",
  scale: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number; width: number; height: number } {
  let drawWidth = imageWidth;
  let drawHeight = imageHeight;
  if (fit === "cover") {
    const cover = Math.max(destWidth / imageWidth, destHeight / imageHeight);
    drawWidth = imageWidth * cover;
    drawHeight = imageHeight * cover;
  } else if (fit === "contain") {
    const contain = Math.min(destWidth / imageWidth, destHeight / imageHeight);
    drawWidth = imageWidth * contain;
    drawHeight = imageHeight * contain;
  } else {
    const center = Math.min(1, destWidth / imageWidth, destHeight / imageHeight);
    drawWidth = imageWidth * center;
    drawHeight = imageHeight * center;
  }
  drawWidth *= scale;
  drawHeight *= scale;
  const spareX = destWidth - drawWidth;
  const spareY = destHeight - drawHeight;
  return {
    x: spareX / 2 + offsetX * Math.abs(spareX) / 2,
    y: spareY / 2 + offsetY * Math.abs(spareY) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}
