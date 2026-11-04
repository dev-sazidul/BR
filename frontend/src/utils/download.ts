export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking in the same tick can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Flatten a transparent PNG onto a solid colour and encode it as JPEG. */
export async function flattenToJpeg(png: Blob, background: string, quality = 0.92): Promise<Blob> {
  const url = URL.createObjectURL(png);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The cutout could not be opened."));
      element.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot create a JPG.");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("The JPG could not be created."))),
        "image/jpeg",
        quality,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
