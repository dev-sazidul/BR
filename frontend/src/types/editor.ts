export type BackgroundFit = "cover" | "contain" | "center";

export type GradientStop = {
  offset: number;
  color: string;
};

export type BackgroundSelection =
  | { type: "transparent" }
  | { type: "color"; color: string; presetId: string | null }
  | { type: "gradient"; presetId: string; angle: number; stops: GradientStop[] }
  | {
      type: "image";
      url: string;
      fit: BackgroundFit;
      scale: number;
      offsetX: number;
      offsetY: number;
      presetId: string | null;
    };

export type CropNorm = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AspectId = "free" | "1:1" | "4:5" | "3:4" | "16:9";

export type EditorSnapshot = {
  background: BackgroundSelection;
  crop: CropNorm | null;
  aspect: AspectId;
  rotation: number;
  width: number;
  height: number;
  lockAspect: boolean;
  sized: boolean;
};

export type ExportFormat = "png" | "jpeg" | "webp";

export type ExportMode = "transparent" | "background";

export type EditorTool = "background" | "presets" | "upload" | "crop" | "rotate" | "resize";

export type MobilePanel = "tools" | "properties";
