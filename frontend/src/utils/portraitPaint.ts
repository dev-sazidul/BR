import type { CropWindow } from "./photoFrame";

export function sourceSize(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  if (source instanceof HTMLCanvasElement) return { width: source.width, height: source.height };
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) return { width: source.width, height: source.height };
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  return { width: 1, height: 1 };
}

function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, width: number, height: number) {
  const size = sourceSize(image);
  const scale = Math.max(width / size.width, height / size.height);
  const drawnWidth = size.width * scale;
  const drawnHeight = size.height * scale;
  ctx.drawImage(image, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cell = Math.max(8, Math.round(Math.min(width, height) / 24));
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      ctx.fillStyle = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? "#ffffff" : "#e7e2d8";
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

export function paintPortrait(
  canvas: HTMLCanvasElement,
  input: {
    subject: CanvasImageSource;
    crop: CropWindow;
    width: number;
    height: number;
    backgroundColor: string | null;
    backgroundImage: CanvasImageSource | null;
    transparent: boolean;
    checkerboard: boolean;
    brightness: number;
    contrast: number;
  },
): void {
  canvas.width = input.width;
  canvas.height = input.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The photo could not be prepared.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, input.width, input.height);
  if (input.checkerboard) drawChecker(ctx, input.width, input.height);
  else if (!input.transparent) {
    if (input.backgroundImage) drawCover(ctx, input.backgroundImage, input.width, input.height);
    else {
      ctx.fillStyle = input.backgroundColor ?? "#ffffff";
      ctx.fillRect(0, 0, input.width, input.height);
    }
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, input.width, input.height);
  ctx.clip();
  ctx.translate(input.width / 2, input.height / 2);
  ctx.rotate((input.crop.rotation * Math.PI) / 180);
  ctx.filter = `brightness(${input.brightness}) contrast(${input.contrast})`;
  ctx.drawImage(
    input.subject,
    input.crop.x,
    input.crop.y,
    input.crop.width,
    input.crop.height,
    -input.width / 2,
    -input.height / 2,
    input.width,
    input.height,
  );
  ctx.filter = "none";
  ctx.restore();
}

export function rotateSource(source: CanvasImageSource, width: number, height: number, direction: 1 | -1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = height;
  canvas.height = width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The photo could not be rotated.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((direction * Math.PI) / 2);
  ctx.drawImage(source, -width / 2, -height / 2);
  return canvas;
}

export function paintPrintSheet(
  canvas: HTMLCanvasElement,
  photo: CanvasImageSource,
  input: {
    sheetWidth: number;
    sheetHeight: number;
    photoWidth: number;
    photoHeight: number;
    margin: number;
    gap: number;
    columns: number;
    rows: number;
  },
): void {
  canvas.width = input.sheetWidth;
  canvas.height = input.sheetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The print sheet could not be prepared.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, input.sheetWidth, input.sheetHeight);
  for (let row = 0; row < input.rows; row += 1) {
    for (let column = 0; column < input.columns; column += 1) {
      const x = input.margin + column * (input.photoWidth + input.gap);
      const y = input.margin + row * (input.photoHeight + input.gap);
      ctx.drawImage(photo, x, y, input.photoWidth, input.photoHeight);
    }
  }
}

export function canvasBlob(canvas: HTMLCanvasElement, format: "jpeg" | "png", quality = 0.92): Promise<Blob> {
  const type = format === "jpeg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("The photo could not be exported."));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}
