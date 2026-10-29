import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { NATURAL_BACKGROUNDS } from "../../data/backgroundPresets";
import {
  ACCEPTANCE_NOTICE,
  COUNTRY_ORDER,
  backgroundConflict,
  documentPresets,
  portraitPresets,
  presetById,
  printMillimetres,
  printSizeNote,
  sizeLabel,
  mmToPx,
  type BackgroundChoice,
  type PhotoPreset,
} from "../../data/photoPresets";
import { useBackgroundRemoval } from "../../hooks/useBackgroundRemoval";
import { detectFaces, largestFace, type FaceDetection } from "../../utils/faceDetect";
import { blobWithDpi } from "../../utils/imageDpi";
import { autoCrop, moveCrop, scaleCrop, type CropWindow } from "../../utils/photoFrame";
import { canvasBlob, paintPortrait, paintPrintSheet, rotateSource, sourceSize } from "../../utils/portraitPaint";
import { PAPERS, sheetPixels, sheetTiles, type PaperId } from "../../utils/printSheet";
import { downloadBlob } from "../../utils/download";
import { formatBytes } from "../../utils/formatBytes";
import { cn } from "../../utils/cn";
import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { Spinner } from "../common/Spinner";
import { Dropzone } from "../uploader/Dropzone";

const SCENE_IDS = ["studio", "office", "daylight", "cafe", "soft-park"];
const JPEG_QUALITY = 0.92;

const scenes = SCENE_IDS.flatMap((id) => {
  const scene = NATURAL_BACKGROUNDS.find((item) => item.id === id);
  return scene ? [scene] : [];
});

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith("blob:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The photo could not be opened."));
    image.src = url;
  });
}

function frameFor(preset: PhotoPreset, width: number, height: number, detection: FaceDetection): { crop: CropWindow; warning: string | null } {
  const frame = autoCrop({
    imageWidth: width,
    imageHeight: height,
    face: largestFace(detection.faces),
    outputWidth: preset.widthPx,
    outputHeight: preset.heightPx,
    headMin: preset.headMin,
    headMax: preset.headMax,
    crownGap: preset.crownGap,
  });
  return {
    crop: frame.crop,
    warning: frame.shrunk
      ? "The photo is too tight for this preset’s head-size guide, so the frame was scaled to fit inside the image."
      : null,
  };
}

export function PortraitTool({
  maxBytes,
  maxDimension,
  aiReady,
  aiDetail,
}: {
  maxBytes: number;
  maxDimension: number;
  aiReady: boolean;
  aiDetail: string | null;
}) {
  const removal = useBackgroundRemoval(maxBytes);
  const [kind, setKind] = useState<"portrait" | "document">("portrait");
  const [portraitId, setPortraitId] = useState("linkedin");
  const [documentId, setDocumentId] = useState("us-passport");
  const [countryQuery, setCountryQuery] = useState("");
  const [background, setBackground] = useState<BackgroundChoice>({ kind: "color", hex: "#FFFFFF" });
  const [backgroundTouched, setBackgroundTouched] = useState(false);
  const [subject, setSubject] = useState<CanvasImageSource | null>(null);
  const [pixelSize, setPixelSize] = useState<{ width: number; height: number } | null>(null);
  const [detection, setDetection] = useState<FaceDetection | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [crop, setCrop] = useState<CropWindow | null>(null);
  const [frameWarning, setFrameWarning] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [guides, setGuides] = useState(true);
  const [showCutout, setShowCutout] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [printOn, setPrintOn] = useState(false);
  const [paper, setPaper] = useState<PaperId>("a4");
  const [marginMm, setMarginMm] = useState(10);
  const [gapMm, setGapMm] = useState(4);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"photo" | "sheet" | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; crop: CropWindow } | null>(null);
  const headingId = useId();

  const preset = presetById(kind === "portrait" ? portraitId : documentId);
  const country = preset.kind === "document" ? preset.country : "United States";
  const query = countryQuery.trim().toLowerCase();
  const visibleDocuments = documentPresets().filter((item) => {
    if (!query) return true;
    return `${item.country} ${item.document} ${item.searchText}`.toLowerCase().includes(query);
  });
  const countries = COUNTRY_ORDER.filter((name) => visibleDocuments.some((item) => item.country === name));
  const countryDocuments = documentPresets().filter((item) => item.country === country);
  const conflict = backgroundConflict(preset, background);
  const scene = background.kind === "photo" ? scenes.find((item) => item.id === background.id) : null;

  useEffect(() => {
    if (backgroundTouched) return;
    const first = preset.backgroundColors[0];
    if (first) setBackground({ kind: "color", hex: first.hex });
  }, [preset, backgroundTouched]);

  useEffect(() => {
    if (background.kind !== "photo") {
      setBackgroundImage(null);
      return;
    }
    const photo = NATURAL_BACKGROUNDS.find((item) => item.id === background.id);
    if (!photo) return;
    let cancelled = false;
    loadImage(photo.full)
      .then((image) => {
        if (!cancelled) setBackgroundImage(image);
      })
      .catch(() => {
        if (!cancelled) setOpenError("The background photo could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [background]);

  useEffect(() => {
    if (!removal.resultUrl) {
      setSubject(null);
      setPixelSize(null);
      setDetection(null);
      setCrop(null);
      setOpenError(null);
      return;
    }
    let cancelled = false;
    setOpenError(null);
    loadImage(removal.resultUrl)
      .then((image) => {
        if (cancelled) return;
        setSubject(image);
        setPixelSize(sourceSize(image));
      })
      .catch((error: unknown) => {
        if (!cancelled) setOpenError(error instanceof Error ? error.message : "The photo could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [removal.resultUrl]);

  useEffect(() => {
    if (!subject) return;
    let cancelled = false;
    setDetecting(true);
    detectFaces(subject)
      .then((result) => {
        if (cancelled) return;
        setDetection(result);
        setDetecting(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDetection({ faces: [], engine: "failed" });
        setDetecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subject]);

  useEffect(() => {
    if (!pixelSize || !detection) return;
    const next = frameFor(preset, pixelSize.width, pixelSize.height, detection);
    setCrop((current) => ({ ...next.crop, rotation: current?.rotation ?? 0 }));
    setFrameWarning(next.warning);
  }, [preset, pixelSize, detection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !subject || !crop) return;
    const exportTransparent = background.kind === "transparent" && format === "png";
    paintPortrait(canvas, {
      subject,
      crop,
      width: preset.widthPx,
      height: preset.heightPx,
      backgroundColor: background.kind === "color" ? background.hex : "#ffffff",
      backgroundImage: !showCutout && background.kind === "photo" ? backgroundImage : null,
      transparent: showCutout ? false : exportTransparent,
      checkerboard: showCutout || exportTransparent,
      brightness,
      contrast,
    });
  }, [subject, crop, preset.widthPx, preset.heightPx, background, backgroundImage, showCutout, brightness, contrast, format]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || !pixelSize) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1 / 1.06 : 1.06;
      setCrop((current) => (current ? scaleCrop(current, factor, pixelSize.width, pixelSize.height) : current));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [pixelSize]);

  function selectCountry(next: string) {
    const first = documentPresets().find((item) => item.country === next);
    if (first) setDocumentId(first.id);
  }

  function chooseColor(hex: string) {
    setBackgroundTouched(true);
    setBackground({ kind: "color", hex });
  }

  function resetFrame() {
    if (!pixelSize || !detection) return;
    const next = frameFor(preset, pixelSize.width, pixelSize.height, detection);
    setCrop(next.crop);
    setFrameWarning(next.warning);
  }

  function nudge(dx: number, dy: number) {
    if (!crop || !pixelSize) return;
    setCrop(moveCrop(crop, dx, dy, pixelSize.width, pixelSize.height));
  }

  function zoom(factor: number) {
    if (!crop || !pixelSize) return;
    setCrop(scaleCrop(crop, factor, pixelSize.width, pixelSize.height));
  }

  function turn(direction: 1 | -1) {
    if (!subject || !pixelSize) return;
    const turned = rotateSource(subject, pixelSize.width, pixelSize.height, direction);
    setCrop(null);
    setDetection(null);
    setSubject(turned);
    setPixelSize({ width: turned.width, height: turned.height });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!crop) return;
    const step = event.shiftKey ? 0.08 : 0.02;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudge(-crop.width * step, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nudge(crop.width * step, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nudge(0, -crop.height * step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nudge(0, crop.height * step);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoom(1.08);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoom(1 / 1.08);
    } else if (event.key === "0") {
      event.preventDefault();
      resetFrame();
    }
  }

  async function paintExport() {
    if (!subject || !crop) throw new Error("The framed photo is not ready yet.");
    if (background.kind === "photo" && !backgroundImage) throw new Error("The background photo is still loading.");
    const canvas = document.createElement("canvas");
    const transparent = background.kind === "transparent" && format === "png";
    paintPortrait(canvas, {
      subject,
      crop,
      width: preset.widthPx,
      height: preset.heightPx,
      backgroundColor: background.kind === "color" ? background.hex : "#ffffff",
      backgroundImage: background.kind === "photo" ? backgroundImage : null,
      transparent,
      checkerboard: false,
      brightness,
      contrast,
    });
    return canvas;
  }

  async function downloadPhoto() {
    setExporting("photo");
    setExportError(null);
    try {
      const canvas = await paintExport();
      const blob = await blobWithDpi(await canvasBlob(canvas, format, JPEG_QUALITY), preset.dpi);
      downloadBlob(blob, `solva-${preset.id}.${format === "jpeg" ? "jpg" : "png"}`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The photo could not be exported.");
    } finally {
      setExporting(null);
    }
  }

  async function downloadSheet() {
    setExporting("sheet");
    setExportError(null);
    try {
      const photo = await paintExport();
      const layout = sheetLayout(preset, paper, marginMm, gapMm);
      if (layout.tiles.count < 1) throw new Error("This photo does not fit on the sheet with these margins.");
      const canvas = document.createElement("canvas");
      paintPrintSheet(canvas, photo, {
        sheetWidth: layout.sheet.width,
        sheetHeight: layout.sheet.height,
        photoWidth: layout.photo.width,
        photoHeight: layout.photo.height,
        margin: layout.margin,
        gap: layout.gap,
        columns: layout.tiles.columns,
        rows: layout.tiles.rows,
      });
      const blob = await blobWithDpi(await canvasBlob(canvas, "jpeg", JPEG_QUALITY), 300);
      downloadBlob(blob, `solva-${preset.id}-${paper}-sheet.jpg`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The print sheet could not be exported.");
    } finally {
      setExporting(null);
    }
  }

  const layout = sheetLayout(preset, paper, marginMm, gapMm);
  const face = detection ? largestFace(detection.faces) : null;
  const hint = `PNG, JPG, or WebP up to ${formatBytes(maxBytes)}. Longest side ${maxDimension} pixels.`;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <h1 id={headingId} className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Portrait and passport photos
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Upload one photo. Solva removes the background, then you choose a profile or document size, a background, and the crop.
          Face detection and framing stay in this browser.
        </p>
      </div>
      <p className="mx-auto mt-4 max-w-3xl rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink">{ACCEPTANCE_NOTICE}</p>

      {!aiReady && aiDetail ? (
        <div className="mt-4">
          <ErrorBanner>Background removal is not available on this server yet. {aiDetail}</ErrorBanner>
        </div>
      ) : null}

      {!removal.file ? (
        <div className="mt-6 space-y-4">
          {removal.error ? <ErrorBanner>{removal.error}</ErrorBanner> : null}
          <Dropzone hint={hint} disabled={removal.busy} onFile={(file) => void removal.start(file)} />
        </div>
      ) : removal.phase === "uploading" || removal.phase === "processing" ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium" role="status">
          <Spinner />
          {removal.phase === "uploading"
            ? `Uploading${removal.uploadProgress != null ? ` ${Math.round(removal.uploadProgress * 100)}%` : "…"}`
            : "Removing the background…"}
        </p>
      ) : null}

      <section className="mt-8 rounded-3xl border border-line bg-white p-4 sm:p-6" aria-labelledby="photo-type-heading">
        <h2 id="photo-type-heading" className="text-lg font-semibold">
          Photo type
        </h2>
        <div className="mt-4 flex gap-2" role="tablist" aria-label="Photo type">
          {(
            [
              ["portrait", "Professional portraits"],
              ["document", "Passport and ID"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={kind === value}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold",
                kind === value ? "bg-brand text-white" : "bg-paper text-ink",
              )}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {kind === "portrait" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {portraitPresets().map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === portraitId}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left",
                  item.id === portraitId ? "border-brand bg-brand-soft" : "border-line hover:border-ink/30",
                )}
                onClick={() => setPortraitId(item.id)}
              >
                <span className="block font-semibold">{item.document}</span>
                <span className="mt-1 block text-sm text-muted">
                  {item.widthPx} × {item.heightPx} px
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label className="text-sm font-semibold" htmlFor="country-search">
                Search countries
              </label>
              <input
                id="country-search"
                value={countryQuery}
                onChange={(event) => setCountryQuery(event.target.value)}
                placeholder="Search by country or document"
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
              <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-auto" role="listbox" aria-label="Countries">
                {countries.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={name === country}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium",
                      name === country ? "border-brand bg-brand text-white" : "border-line bg-white",
                    )}
                    onClick={() => selectCountry(name)}
                  >
                    {name}
                  </button>
                ))}
                {countries.length === 0 ? <p className="text-sm text-muted">No country matches that search.</p> : null}
              </div>
            </div>
            <label className="text-sm font-semibold">
              Document type
              <select
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-sm font-medium"
                value={preset.kind === "document" ? preset.id : countryDocuments[0]?.id}
                onChange={(event) => setDocumentId(event.target.value)}
              >
                {countryDocuments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.document}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <Requirements preset={preset} />

      <section className="mt-4 rounded-3xl border border-line bg-white p-4 sm:p-6" aria-labelledby="background-heading">
        <h2 id="background-heading" className="text-lg font-semibold">
          Background
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{preset.backgroundNote}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {preset.backgroundColors.map((color) => (
            <button
              key={color.hex}
              type="button"
              aria-pressed={background.kind === "color" && background.hex.toLowerCase() === color.hex.toLowerCase()}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                background.kind === "color" && background.hex.toLowerCase() === color.hex.toLowerCase()
                  ? "border-brand"
                  : "border-line",
              )}
              onClick={() => chooseColor(color.hex)}
            >
              <span className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: color.hex }} />
              {color.name}
            </button>
          ))}
          <label className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-medium">
            Other colour
            <input
              aria-label="Other background colour"
              type="color"
              value={background.kind === "color" ? background.hex : "#ffffff"}
              onChange={(event) => chooseColor(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              background.kind === "transparent" ? "border-brand" : "border-line",
            )}
            aria-pressed={background.kind === "transparent"}
            onClick={() => {
              setBackgroundTouched(true);
              setBackground({ kind: "transparent" });
              setFormat("png");
            }}
          >
            Transparent PNG
          </button>
        </div>
        {preset.allowPhotoBackground ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Office, studio, and outdoor scenes</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {scenes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={background.kind === "photo" && background.id === item.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border text-left",
                    background.kind === "photo" && background.id === item.id ? "border-brand" : "border-line",
                  )}
                  onClick={() => {
                    setBackgroundTouched(true);
                    setBackground({ kind: "photo", id: item.id });
                  }}
                >
                  <img src={item.thumb} alt="" className="aspect-[4/3] w-full object-cover" />
                  <span className="block px-2 py-2 text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold">Photo backgrounds</summary>
            <p className="mt-2 text-sm leading-6 text-muted">
              A photo scene does not match this document preset. Choosing one keeps your selection and shows a warning.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {scenes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="overflow-hidden rounded-2xl border border-line text-left"
                  onClick={() => {
                    setBackgroundTouched(true);
                    setBackground({ kind: "photo", id: item.id });
                  }}
                >
                  <img src={item.thumb} alt="" className="aspect-[4/3] w-full object-cover" />
                  <span className="block px-2 py-2 text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </details>
        )}
        {scene ? (
          <p className="mt-3 text-xs leading-5 text-muted">
            {scene.label} by {scene.author}, {scene.license}.{" "}
            <a className="font-semibold text-brand" href={scene.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          </p>
        ) : null}
        {conflict ? (
          <p role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {conflict}
          </p>
        ) : null}
      </section>

      {removal.file ? (
        <section className="mt-4 rounded-3xl border border-line bg-white p-4 sm:p-6" aria-labelledby="editor-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="editor-heading" className="text-lg font-semibold">
              Crop and preview
            </h2>
            <p className="text-sm text-muted">{removal.file.name}</p>
          </div>

          {removal.error ? (
            <div className="mt-4">
              <ErrorBanner>{removal.error}</ErrorBanner>
            </div>
          ) : null}
          {openError ? (
            <div className="mt-4">
              <ErrorBanner>{openError}</ErrorBanner>
            </div>
          ) : null}

          {removal.phase === "uploading" || removal.phase === "processing" ? (
            <p className="mt-6 flex items-center gap-2 text-sm font-medium" role="status">
              <Spinner />
              {removal.phase === "uploading"
                ? `Uploading${removal.uploadProgress != null ? ` ${Math.round(removal.uploadProgress * 100)}%` : "…"}`
                : "Removing the background…"}
            </p>
          ) : null}

          {removal.phase === "ready" && (!crop || detecting) ? (
            <p className="mt-6 flex items-center gap-2 text-sm font-medium" role="status">
              <Spinner />
              {detecting ? "Looking for a face…" : "Framing the photo…"}
            </p>
          ) : null}

          {detection && detection.faces.length === 0 ? (
            <p role="status" className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm leading-6">
              {detection.engine === "unavailable"
                ? "This browser has no built-in face detector, so the photo was centered. Drag it into place, or use the arrow keys."
                : "No face was detected, so the photo was centered. Drag it into place, or use the arrow keys."}
            </p>
          ) : null}
          {detection && detection.faces.length > 1 ? (
            <p role="status" className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm leading-6">
              {detection.faces.length} faces were found. Positioning uses the largest one. Move the frame if that is the wrong person.
            </p>
          ) : null}
          {frameWarning ? (
            <p role="status" className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm leading-6">
              {frameWarning}
            </p>
          ) : null}
          {pixelSize && (pixelSize.width < preset.widthPx || pixelSize.height < preset.heightPx) ? (
            <p role="status" className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm leading-6">
              The cutout is smaller than the export in at least one direction, so the file will be enlarged and may look soft.
            </p>
          ) : null}

          {crop && pixelSize ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <div
                  ref={frameRef}
                  role="application"
                  tabIndex={0}
                  aria-label="Crop editor. Drag to move the photo. Arrow keys nudge it, plus and minus zoom, and 0 resets the frame."
                  className="relative touch-none overflow-hidden rounded-2xl bg-paper outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  onPointerDown={(event) => {
                    if (!crop) return;
                    drag.current = { x: event.clientX, y: event.clientY, crop };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!drag.current || !pixelSize) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (!rect.width || !rect.height) return;
                    const dx = ((event.clientX - drag.current.x) / rect.width) * drag.current.crop.width;
                    const dy = ((event.clientY - drag.current.y) / rect.height) * drag.current.crop.height;
                    setCrop(moveCrop(drag.current.crop, -dx, -dy, pixelSize.width, pixelSize.height));
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onKeyDown={onKeyDown}
                >
                  <canvas
                    ref={canvasRef}
                    className="block h-auto w-full"
                    style={{ aspectRatio: `${preset.widthPx} / ${preset.heightPx}` }}
                    aria-label={`Framed preview, ${preset.widthPx} by ${preset.heightPx} pixels`}
                  />
                  {guides ? <Guides preset={preset} crop={crop} face={face} rotated={crop.rotation !== 0} /> : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  The preview is scaled to fit. The downloaded photo is exactly {preset.widthPx} × {preset.heightPx} pixels.
                  {crop.rotation !== 0 ? " Face guides are hidden while the photo is rotated." : ""}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <figure className="overflow-hidden rounded-2xl border border-line">
                    {removal.originalUrl ? (
                      <img src={removal.originalUrl} alt="Original upload" className="max-h-64 w-full object-contain bg-paper" />
                    ) : null}
                    <figcaption className="px-3 py-2 text-xs font-medium text-muted">Original upload</figcaption>
                  </figure>
                  <figure className="rounded-2xl border border-line px-3 py-3 text-sm leading-6">
                    <figcaption className="font-semibold">Checklist</figcaption>
                    <ul className="mt-2 space-y-1 text-muted">
                      <li>{face ? "A face box was found. It is an estimate, not a compliance check." : "No face box is available. The crop is manual."}</li>
                      <li>The crop keeps the {preset.widthPx}:{preset.heightPx} pixel ratio.</li>
                      <li>
                        {preset.headMin != null
                          ? "The head band is a guide from the published range. Eye position is not measured."
                          : "This preset has no published chin-to-crown range, so the head band is hidden."}
                      </li>
                      <li>{conflict ? "The background does not match the listed colours." : "The background matches a listed choice, or this preset does not restrict it."}</li>
                      <li>None of these checks mean an authority will accept the photo.</li>
                    </ul>
                  </figure>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => zoom(1 / 1.08)} aria-label="Zoom out">
                    <Minus size={16} aria-hidden="true" /> Zoom out
                  </Button>
                  <Button variant="secondary" onClick={() => zoom(1.08)} aria-label="Zoom in">
                    <Plus size={16} aria-hidden="true" /> Zoom in
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span />
                  <Button variant="secondary" aria-label="Move up" onClick={() => crop && nudge(0, -crop.height * 0.02)}>
                    <ChevronUp size={16} aria-hidden="true" />
                  </Button>
                  <span />
                  <Button variant="secondary" aria-label="Move left" onClick={() => crop && nudge(-crop.width * 0.02, 0)}>
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Button>
                  <Button variant="secondary" onClick={resetFrame}>
                    <RotateCcw size={16} aria-hidden="true" /> Reset
                  </Button>
                  <Button variant="secondary" aria-label="Move right" onClick={() => crop && nudge(crop.width * 0.02, 0)}>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                  <span />
                  <Button variant="secondary" aria-label="Move down" onClick={() => crop && nudge(0, crop.height * 0.02)}>
                    <ChevronDown size={16} aria-hidden="true" />
                  </Button>
                  <span />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => turn(-1)}>
                    <RotateCcw size={16} aria-hidden="true" /> Rotate left
                  </Button>
                  <Button variant="secondary" onClick={() => turn(1)}>
                    <RotateCw size={16} aria-hidden="true" /> Rotate right
                  </Button>
                </div>
                <label className="block text-sm font-semibold">
                  Straighten ({crop.rotation.toFixed(0)}°)
                  <input
                    className="mt-2 w-full"
                    type="range"
                    min={-15}
                    max={15}
                    step={1}
                    value={crop.rotation}
                    aria-label="Straighten"
                    onChange={(event) => setCrop({ ...crop, rotation: Number(event.target.value) })}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} />
                  Show crop guides
                </label>
                <Button variant="secondary" onClick={() => setShowCutout((value) => !value)}>
                  {showCutout ? "Show framed photo" : "Show cutout"}
                </Button>
                <p className="text-xs leading-5 text-muted">The cutout view is for comparison. Download photo saves the framed picture.</p>
                <details className="rounded-2xl border border-line px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold">Brightness and contrast</summary>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    These sliders stay near the original. They do not reshape the face or recolour skin. A document office can still reject an adjusted photo.
                  </p>
                  <label className="mt-3 block text-sm">
                    Brightness
                    <input
                      className="mt-1 w-full"
                      type="range"
                      min={0.9}
                      max={1.1}
                      step={0.01}
                      value={brightness}
                      aria-label="Brightness"
                      onChange={(event) => setBrightness(Number(event.target.value))}
                    />
                  </label>
                  <label className="mt-3 block text-sm">
                    Contrast
                    <input
                      className="mt-1 w-full"
                      type="range"
                      min={0.9}
                      max={1.1}
                      step={0.01}
                      value={contrast}
                      aria-label="Contrast"
                      onChange={(event) => setContrast(Number(event.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-brand"
                    onClick={() => {
                      setBrightness(1);
                      setContrast(1);
                    }}
                  >
                    Reset adjustments
                  </button>
                </details>
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-semibold">Download</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              File: {preset.widthPx} × {preset.heightPx} px. {printSizeNote(preset)} JPEG files use quality {Math.round(JPEG_QUALITY * 100)}. A
              density tag is written when the file is JPEG or PNG. Some printers ignore it.
            </p>
            {background.kind === "transparent" && format === "jpeg" ? (
              <p className="mt-2 text-sm leading-6 text-muted">JPEG cannot store transparency, so this file is flattened on white.</p>
            ) : null}
            {background.kind === "transparent" && format === "png" ? (
              <p className="mt-2 text-sm leading-6 text-muted">The checkerboard is only a preview. The PNG file is transparent.</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold">
                Format
                <select
                  aria-label="File format"
                  className="ml-2 rounded-full border border-line bg-paper px-3 py-2 text-sm"
                  value={format}
                  onChange={(event) => setFormat(event.target.value === "png" ? "png" : "jpeg")}
                >
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                </select>
              </label>
              <Button onClick={() => void downloadPhoto()} disabled={!crop || exporting !== null}>
                {exporting === "photo" ? <Spinner /> : null}
                Download photo
              </Button>
              <Button variant="secondary" onClick={() => replaceRef.current?.click()} disabled={removal.busy}>
                Edit another photo
              </Button>
              <Button variant="ghost" onClick={removal.reset}>
                Start over
              </Button>
              {removal.phase === "error" ? (
                <Button variant="secondary" onClick={removal.retry}>
                  Try again
                </Button>
              ) : null}
            </div>
            <input
              ref={replaceRef}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Choose another image"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void removal.start(file);
              }}
            />

            <div className="mt-5 rounded-2xl border border-line p-4">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={printOn} onChange={(event) => setPrintOn(event.target.checked)} />
                Print sheet
              </label>
              <p className="mt-2 text-sm leading-6 text-muted">
                The sheet is {PAPERS[paper].label} ({PAPERS[paper].widthMm} × {PAPERS[paper].heightMm} mm). Each copy is the photo’s print size,
                not the paper size. {layout.tiles.count} {layout.tiles.count === 1 ? "copy fits" : "copies fit"} with the current margin and gap.
              </p>
              {printOn ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  <label className="text-sm font-medium">
                    Paper
                    <select
                      aria-label="Paper size"
                      className="ml-2 rounded-full border border-line bg-paper px-3 py-2"
                      value={paper}
                      onChange={(event) => setPaper(event.target.value === "letter" ? "letter" : "a4")}
                    >
                      <option value="a4">A4</option>
                      <option value="letter">US Letter</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Margin (mm)
                    <input
                      aria-label="Sheet margin in millimetres"
                      className="ml-2 w-20 rounded-full border border-line bg-paper px-3 py-2"
                      type="number"
                      min={4}
                      max={30}
                      value={marginMm}
                      onChange={(event) => setMarginMm(Number(event.target.value) || 0)}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Gap (mm)
                    <input
                      aria-label="Gap between photos in millimetres"
                      className="ml-2 w-20 rounded-full border border-line bg-paper px-3 py-2"
                      type="number"
                      min={0}
                      max={20}
                      value={gapMm}
                      onChange={(event) => setGapMm(Number(event.target.value) || 0)}
                    />
                  </label>
                  <Button variant="secondary" onClick={() => void downloadSheet()} disabled={!crop || exporting !== null || layout.tiles.count < 1}>
                    {exporting === "sheet" ? <Spinner /> : null}
                    Download print sheet
                  </Button>
                </div>
              ) : null}
            </div>
            {exportError ? (
              <div className="mt-4">
                <ErrorBanner>{exportError}</ErrorBanner>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function sheetLayout(preset: PhotoPreset, paper: PaperId, marginMm: number, gapMm: number) {
  const sheet = sheetPixels(paper);
  const printed = printMillimetres(preset);
  const photo = { width: mmToPx(printed.width), height: mmToPx(printed.height) };
  const margin = mmToPx(Math.max(0, marginMm));
  const gap = mmToPx(Math.max(0, gapMm));
  return { sheet, photo, margin, gap, tiles: sheetTiles({ photoWidth: photo.width, photoHeight: photo.height, sheetWidth: sheet.width, sheetHeight: sheet.height, margin, gap }) };
}

function Requirements({ preset }: { preset: PhotoPreset }) {
  const printed = printMillimetres(preset);
  return (
    <section className="mt-4 rounded-3xl border border-line bg-white p-4 sm:p-6" aria-labelledby="requirements-heading">
      <h2 id="requirements-heading" className="text-lg font-semibold">
        Dimensions and requirements
      </h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Country</dt>
          <dd className="text-muted">{preset.country}</dd>
        </div>
        <div>
          <dt className="font-semibold">Document</dt>
          <dd className="text-muted">{preset.document}</dd>
        </div>
        <div>
          <dt className="font-semibold">Size</dt>
          <dd className="text-muted">{sizeLabel(preset)}</dd>
        </div>
        <div>
          <dt className="font-semibold">File</dt>
          <dd className="text-muted">
            {preset.widthPx} × {preset.heightPx} px
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Background</dt>
          <dd className="text-muted">{preset.backgroundNote}</dd>
        </div>
        <div>
          <dt className="font-semibold">Print placement</dt>
          <dd className="text-muted">
            {printed.fromSource
              ? `${printed.width.toFixed(1)} × ${printed.height.toFixed(1)} mm on the sheet`
              : "Pixel size only. The sheet uses a 300 dpi conversion."}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6">{preset.framing}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{preset.sourceNote}</p>
      <p className="mt-3 text-sm font-semibold" role="status">
        {preset.kind === "portrait"
          ? "Solva framing guide. This is not an official document size."
          : !preset.verified
            ? "Unverified. Do not treat this size as officially compliant."
            : preset.disputed
              ? `Sources disagree. Checked ${preset.lastChecked}. This is not the only size the linked pages mention.`
              : `Checked against the linked source on ${preset.lastChecked}. This does not mean the finished photo will be accepted.`}
      </p>
      {preset.sources.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {preset.sources.map((source) => (
            <li key={source.url}>
              <a className="font-semibold text-brand" href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No government source. This preset is a Solva framing guide.</p>
      )}
    </section>
  );
}

function Guides({
  preset,
  crop,
  face,
  rotated,
}: {
  preset: PhotoPreset;
  crop: CropWindow;
  face: { x: number; y: number; width: number; height: number } | null;
  rotated: boolean;
}) {
  const band =
    preset.headMin != null && preset.headMax != null
      ? { top: preset.crownGap * 100, min: (preset.crownGap + preset.headMin) * 100, max: (preset.crownGap + preset.headMax) * 100 }
      : null;
  const faceStyle =
    face && !rotated
      ? {
          left: `${((face.x - crop.x) / crop.width) * 100}%`,
          top: `${((face.y - crop.y) / crop.height) * 100}%`,
          width: `${(face.width / crop.width) * 100}%`,
          height: `${(face.height / crop.height) * 100}%`,
        }
      : null;
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-[5%] rounded-xl border border-dashed border-white/80" />
      {band ? (
        <>
          <div className="absolute inset-x-0 border-t border-brand" style={{ top: `${band.top}%` }} />
          <div className="absolute inset-x-0 border-t border-white/80" style={{ top: `${band.min}%` }} />
          <div className="absolute inset-x-0 border-t border-white/80" style={{ top: `${band.max}%` }} />
        </>
      ) : null}
      {faceStyle ? <div className="absolute border-2 border-brand" style={faceStyle} /> : null}
    </div>
  );
}
