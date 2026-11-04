import { useCallback, useEffect, useRef, useState } from "react";

import { useEditorHistory } from "./useEditorHistory";
import type { NaturalBackground } from "../data/backgroundPresets";
import { presetById } from "../data/backgroundPresets";
import type { AspectId, BackgroundFit, CropNorm, EditorSnapshot, EditorTool, ExportFormat, ExportMode, ShadowSettings } from "../types/editor";
import { editedFilename, exportEditedImage } from "../utils/imageExport";
import {
  ASPECT_RATIOS,
  MAX_BACKGROUND_EDGE,
  createSnapshot,
  rotatedBounds,
  withCrop,
  withRotation,
  withSize,
} from "../utils/imageGeometry";
import { downloadBlob } from "../utils/download";
import { validateClientFile } from "../utils/validateFile";

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith("blob:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = url;
  });
}

export function useImageEditor(foregroundUrl: string, maxBytes: number, fileName: string) {
  const [foreground, setForeground] = useState<HTMLImageElement | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<EditorTool>("presets");
  const [comparing, setComparing] = useState(false);
  const history = useEditorHistory();
  const { boot, stage, commit: commitHistory, undo, redo, reset: resetHistory } = history;
  const owned = useRef(new Set<string>());
  const source = useRef({ width: 0, height: 0 });
  const presentRef = useRef<EditorSnapshot | null>(null);
  presentRef.current = history.present;

  useEffect(() => {
    const urls = owned.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setForeground(null);
    loadHtmlImage(foregroundUrl)
      .then((image) => {
        if (cancelled) return;
        source.current = { width: image.naturalWidth, height: image.naturalHeight };
        setForeground(image);
        boot(createSnapshot(image.naturalWidth, image.naturalHeight));
      })
      .catch(() => {
        if (!cancelled) setLoadError("The cutout could not be opened in the editor.");
      });
    return () => {
      cancelled = true;
    };
  }, [foregroundUrl, boot]);

  const imageUrl = history.present?.background.type === "image" ? history.present.background.url : null;
  useEffect(() => {
    if (!imageUrl) {
      setBackgroundImage(null);
      return;
    }
    let cancelled = false;
    loadHtmlImage(imageUrl)
      .then((image) => {
        if (!cancelled) setBackgroundImage(image);
      })
      .catch(() => {
        if (!cancelled) setUploadError("Could not read that background image.");
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const commit = useCallback(
    (recipe: (current: EditorSnapshot) => EditorSnapshot) => {
      const current = presentRef.current;
      if (!current) return;
      commitHistory(recipe(current));
    },
    [commitHistory],
  );

  const selectTransparent = useCallback(() => {
    commit((current) => ({ ...current, background: { type: "transparent" } }));
  }, [commit]);

  const selectColor = useCallback(
    (color: string, presetId: string | null = null) => {
      commit((current) => ({ ...current, background: { type: "color", color, presetId } }));
    },
    [commit],
  );

  const selectPreset = useCallback(
    (preset: NaturalBackground) => {
      setUploadError(null);
      commit((current) => ({
        ...current,
        background: {
          type: "image",
          url: preset.full,
          fit: "cover",
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          presetId: preset.id,
        },
      }));
    },
    [commit],
  );

  const uploadBackground = useCallback(
    async (file: File) => {
      const problem = validateClientFile(file, maxBytes);
      if (problem) {
        setUploadError(problem);
        return;
      }
      const url = URL.createObjectURL(file);
      try {
        const image = await loadHtmlImage(url);
        if (Math.max(image.naturalWidth, image.naturalHeight) > MAX_BACKGROUND_EDGE) {
          URL.revokeObjectURL(url);
          setUploadError(`Use a background no larger than ${MAX_BACKGROUND_EDGE} pixels on a side.`);
          return;
        }
        owned.current.add(url);
        setUploadError(null);
        setBackgroundImage(image);
        commit((current) => ({
          ...current,
          background: { type: "image", url, fit: "cover", scale: 1, offsetX: 0, offsetY: 0, presetId: null },
        }));
      } catch {
        URL.revokeObjectURL(url);
        setUploadError("Could not read that image.");
      }
    },
    [commit, maxBytes],
  );

  const clearBackgroundImage = useCallback(() => {
    selectTransparent();
  }, [selectTransparent]);

  const placeBackground = useCallback(
    (patch: Partial<{ fit: BackgroundFit; scale: number; offsetX: number; offsetY: number }>, mode: "stage" | "commit") => {
      const current = presentRef.current;
      if (!current || current.background.type !== "image") return;
      const next: EditorSnapshot = {
        ...current,
        background: { ...current.background, ...patch },
      };
      if (mode === "stage") stage(next);
      else commitHistory(next);
    },
    [commitHistory, stage],
  );

  const updateShadow = useCallback(
    (patch: Partial<ShadowSettings>, mode: "stage" | "commit") => {
      const current = presentRef.current;
      if (!current) return;
      const next: EditorSnapshot = { ...current, shadow: { ...current.shadow, ...patch } };
      if (mode === "stage") stage(next);
      else commitHistory(next);
    },
    [commitHistory, stage],
  );

  const setMatchScene = useCallback(
    (matchScene: boolean) => {
      commit((current) => ({ ...current, matchScene }));
    },
    [commit],
  );

  const changeRotation = useCallback(
    (rotation: number, mode: "stage" | "commit" = "commit") => {
      const current = presentRef.current;
      if (!current) return;
      const next = withRotation(current, source.current.width, source.current.height, rotation);
      if (mode === "stage") stage(next);
      else commitHistory(next);
    },
    [commitHistory, stage],
  );

  const applyCrop = useCallback(
    (crop: CropNorm | null, aspect: AspectId) => {
      commit((current) => withCrop(current, source.current.width, source.current.height, crop, aspect));
    },
    [commit],
  );

  const resize = useCallback(
    (edge: "width" | "height", value: number) => {
      commit((current) => withSize(current, source.current.width, source.current.height, edge, value));
    },
    [commit],
  );

  const toggleLock = useCallback(() => {
    commit((current) => ({ ...current, lockAspect: !current.lockAspect }));
  }, [commit]);

  const reset = useCallback(() => {
    if (!foreground) return;
    setZoom(1);
    setComparing(false);
    setUploadError(null);
    setExportError(null);
    resetHistory(createSnapshot(foreground.naturalWidth, foreground.naturalHeight));
  }, [foreground, resetHistory]);

  const exportImage = useCallback(
    async (format: ExportFormat, mode: ExportMode) => {
      const current = presentRef.current;
      if (!foreground || !current || exporting) return;
      setExporting(true);
      setExportError(null);
      try {
        const blob = await exportEditedImage({
          foreground: { width: foreground.naturalWidth, height: foreground.naturalHeight, source: foreground },
          backgroundImage: backgroundImage
            ? { width: backgroundImage.naturalWidth, height: backgroundImage.naturalHeight, source: backgroundImage }
            : null,
          snapshot: current,
          format,
          mode,
        });
        downloadBlob(blob, editedFilename(fileName, format));
      } catch (err) {
        setExportError(err instanceof Error ? err.message : "Could not export that image.");
      } finally {
        setExporting(false);
      }
    },
    [backgroundImage, exporting, fileName, foreground],
  );

  return {
    foreground,
    backgroundImage,
    snapshot: history.present,
    loadError,
    uploadError,
    exportError,
    exporting,
    zoom,
    tool,
    comparing,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    setZoom,
    setTool,
    setComparing,
    selectTransparent,
    selectColor,
    selectPreset,
    uploadBackground,
    clearBackgroundImage,
    placeBackground,
    updateShadow,
    setMatchScene,
    changeRotation,
    applyCrop,
    resize,
    toggleLock,
    undo,
    redo,
    reset,
    exportImage,
    activePreset: presetById(
      history.present?.background.type === "image" ? history.present.background.presetId ?? "" : "",
    ),
    rotatedFrame: foreground
      ? rotatedBounds(foreground.naturalWidth, foreground.naturalHeight, history.present?.rotation ?? 0)
      : null,
    aspectRatio: ASPECT_RATIOS[history.present?.aspect ?? "free"],
  };
}
