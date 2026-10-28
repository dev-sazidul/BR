import { formatBytes } from "./formatBytes";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export const FILE_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

export function validateClientFile(file: File, maxBytes: number): string | null {
  const name = file.name.toLowerCase();
  const extensionOk = EXTENSIONS.some((extension) => name.endsWith(extension));
  const typeOk = TYPES.has(file.type);
  if (!typeOk && !extensionOk) {
    return "Use a PNG, JPG, or WebP image.";
  }
  if (file.size <= 0) {
    return "That file is empty.";
  }
  if (file.size > maxBytes) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`;
  }
  return null;
}
