import type { BackgroundSelection, EditorSnapshot, ExportFormat, ExportMode } from "../types/editor";
import { paintComposition, type Drawable } from "./imageComposition";

export type ExportPlan = {
  includeBackground: boolean;
  underlay: string | null;
  mime: string;
};

export function exportPlan(format: ExportFormat, mode: ExportMode, background: BackgroundSelection): ExportPlan {
  const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  if (format === "jpeg") {
    return {
      includeBackground: background.type !== "transparent",
      underlay: background.type === "color" || background.type === "gradient" ? null : "#FFFFFF",
      mime,
    };
  }
  if (mode === "transparent") return { includeBackground: false, underlay: null, mime };
  return {
    includeBackground: true,
    underlay: background.type === "transparent" || background.type === "image" ? "#FFFFFF" : null,
    mime,
  };
}

export function editedFilename(original: string, format: ExportFormat): string {
  const base = original.replace(/\.[^.]+$/, "").trim() || "solva";
  const ext = format === "jpeg" ? "jpg" : format;
  return `${base}-edit.${ext}`;
}

export async function exportEditedImage(options: {
  foreground: Drawable;
  backgroundImage: Drawable | null;
  snapshot: EditorSnapshot;
  format: ExportFormat;
  mode: ExportMode;
}): Promise<Blob> {
  const plan = exportPlan(options.format, options.mode, options.snapshot.background);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, options.snapshot.width);
  canvas.height = Math.max(1, options.snapshot.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot export the edited image.");
  paintComposition(ctx, {
    foreground: options.foreground,
    backgroundImage: options.backgroundImage,
    snapshot: options.snapshot,
    includeBackground: plan.includeBackground,
    underlay: plan.underlay,
    destWidth: canvas.width,
    destHeight: canvas.height,
    scale: 1,
  });
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, plan.mime, plan.mime === "image/png" ? undefined : 0.92);
  });
  if (!blob) throw new Error("Could not export that image.");
  if (plan.mime === "image/webp" && blob.type && blob.type !== "image/webp") {
    throw new Error("This browser cannot export WebP.");
  }
  return blob;
}
