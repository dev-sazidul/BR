import { useState } from "react";

import { useImageEditor } from "../../hooks/useImageEditor";
import type { AspectId, CropNorm, EditorTool, MobilePanel } from "../../types/editor";
import { ASPECT_RATIOS, centeredAspectCrop } from "../../utils/imageGeometry";
import { cn } from "../../utils/cn";
import { ErrorBanner } from "../common/ErrorBanner";
import { Spinner } from "../common/Spinner";
import { BackgroundPresetGallery } from "./BackgroundPresetGallery";
import { CropTool } from "./CropTool";
import { CustomBackgroundUploader } from "./CustomBackgroundUploader";
import { EditorCanvas } from "./EditorCanvas";
import { EditorProperties, SizeFields } from "./EditorProperties";
import { ExportDialog } from "./ExportDialog";
import { ImageTransformToolbar } from "./ImageTransformToolbar";
import { Button } from "../common/Button";
import { SmartBackgroundSearch } from "./SmartBackgroundSearch";

const TOOLS: Array<{ id: EditorTool; label: string }> = [
  { id: "presets", label: "Natural backgrounds" },
  { id: "background", label: "Find Backgrounds" },
  { id: "upload", label: "Custom background" },
  { id: "crop", label: "Crop" },
  { id: "rotate", label: "Rotate" },
  { id: "resize", label: "Resize" },
];

type AdvancedImageEditorProps = {
  originalUrl: string;
  foregroundUrl: string;
  fileName: string;
  maxBytes: number;
  onClose: () => void;
};

export function AdvancedImageEditor({ originalUrl, foregroundUrl, fileName, maxBytes, onClose }: AdvancedImageEditorProps) {
  const editor = useImageEditor(foregroundUrl, maxBytes, fileName);
  const [custom, setCustom] = useState("#F4EDE4");
  const [draft, setDraft] = useState<CropNorm>({ x: 0, y: 0, width: 1, height: 1 });
  const [draftAspect, setDraftAspect] = useState<AspectId>("free");
  const [mobile, setMobile] = useState<MobilePanel>("tools");
  const [exportOpen, setExportOpen] = useState(false);
  const snapshot = editor.snapshot;

  function openTool(next: EditorTool) {
    editor.setTool(next);
    setMobile("tools");
    if (next === "crop" && snapshot) {
      setDraft(snapshot.crop ?? { x: 0, y: 0, width: 1, height: 1 });
      setDraftAspect(snapshot.aspect);
    }
    if (next === "resize") setMobile("properties");
  }

  function chooseAspect(aspect: AspectId) {
    setDraftAspect(aspect);
    if (!editor.rotatedFrame) return;
    setDraft(centeredAspectCrop(editor.rotatedFrame, ASPECT_RATIOS[aspect]) ?? { x: 0, y: 0, width: 1, height: 1 });
  }

  if (editor.loadError) return <ErrorBanner>{editor.loadError}</ErrorBanner>;
  if (!editor.foreground || !snapshot || !editor.rotatedFrame) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-medium text-brand-dark">
        <Spinner />
        Preparing editor…
      </p>
    );
  }

  const customUpload = snapshot.background.type === "image" && snapshot.background.presetId === null ? snapshot.background.url : null;
  const activePreset = snapshot.background.type === "image" ? snapshot.background.presetId : null;

  return (
    <section className="mt-5" aria-label="Advanced editor">
      <ImageTransformToolbar
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        comparing={editor.comparing}
        exporting={editor.exporting}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onReset={() => {
          editor.reset();
          editor.setTool("presets");
          setDraft({ x: 0, y: 0, width: 1, height: 1 });
          setDraftAspect("free");
        }}
        onCompare={() => editor.setComparing(!editor.comparing)}
        onDownload={() => setExportOpen(true)}
        onClose={onClose}
      />
      <div className="mt-3 flex gap-2 lg:hidden" role="tablist" aria-label="Editor panels">
        {(["tools", "properties"] as const).map((panel) => (
          <button
            key={panel}
            type="button"
            role="tab"
            aria-selected={mobile === panel}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-semibold",
              mobile === panel ? "border-ink bg-ink text-white" : "border-line bg-white",
            )}
            onClick={() => setMobile(panel)}
          >
            {panel === "tools" ? "Tools" : "Properties"}
          </button>
        ))}
      </div>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)_240px]">
        <aside className={cn("order-2 rounded-2xl border border-line bg-white p-3 lg:order-none", mobile === "tools" ? "block" : "hidden", "lg:block")}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Editing tools">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                aria-pressed={editor.tool === tool.id}
                className={cn(
                  "rounded-xl border px-2 py-2 text-left text-xs font-semibold",
                  editor.tool === tool.id ? "border-brand bg-brand-soft text-brand-dark" : "border-line",
                )}
                onClick={() => openTool(tool.id)}
              >
                {tool.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {editor.tool === "presets" ? (
              <BackgroundPresetGallery
                activeId={activePreset}
                transparent={snapshot.background.type === "transparent"}
                customColor={custom}
                onSelect={editor.selectPreset}
                onTransparent={editor.selectTransparent}
                onCustomUpload={() => openTool("upload")}
                onCustomColor={(color) => {
                  setCustom(color);
                  editor.selectColor(color, null);
                }}
              />
            ) : null}
            {editor.tool === "background" ? (
              <SmartBackgroundSearch
                subject={editor.foreground}
                onApply={(photo) => editor.selectRemoteBackground(photo.src.large)}
              />
            ) : null}
            {editor.tool === "upload" ? (
              <CustomBackgroundUploader
                previewUrl={customUpload}
                error={editor.uploadError}
                onFile={(file) => void editor.uploadBackground(file)}
                onRemove={editor.clearBackgroundImage}
              />
            ) : null}
            {editor.tool === "crop" ? (
              <CropTool
                aspect={draftAspect}
                onAspect={chooseAspect}
                onApply={() => editor.applyCrop(fullFrame(draft) ? null : draft, draftAspect)}
                onCancel={() => editor.setTool("presets")}
              />
            ) : null}
            {editor.tool === "rotate" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => editor.changeRotation(snapshot.rotation - 90)}>
                    Left
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => editor.changeRotation(snapshot.rotation + 90)}>
                    Right
                  </Button>
                </div>
                <label className="block text-sm">
                  Angle
                  <input
                    aria-label="Rotation angle"
                    type="range"
                    min={-180}
                    max={180}
                    value={snapshot.rotation}
                    className="mt-1 w-full"
                    onChange={(event) => editor.changeRotation(Number(event.target.value), "stage")}
                    onPointerUp={(event) => editor.changeRotation(Number(event.currentTarget.value), "commit")}
                    onBlur={(event) => editor.changeRotation(Number(event.currentTarget.value), "commit")}
                  />
                </label>
                <Button variant="ghost" className="w-full" onClick={() => editor.changeRotation(0)}>
                  Reset rotation
                </Button>
              </div>
            ) : null}
            {editor.tool === "resize" ? (
              <>
                <p className="hidden text-sm leading-6 text-muted lg:block">Set the output size in Properties.</p>
                <div className="lg:hidden">
                  <SizeFields snapshot={snapshot} onResize={editor.resize} onToggleLock={editor.toggleLock} />
                </div>
              </>
            ) : null}
          </div>
        </aside>
        <div className="order-1 min-w-0 lg:order-none">
          <EditorCanvas
          originalUrl={originalUrl}
          foreground={editor.foreground}
          backgroundImage={editor.backgroundImage}
          snapshot={snapshot}
          zoom={editor.zoom}
          comparing={editor.comparing}
          cropping={editor.tool === "crop" && !editor.comparing}
          draft={draft}
          cropRatio={ASPECT_RATIOS[draftAspect]}
          rotatedFrame={editor.rotatedFrame}
          onZoom={editor.setZoom}
          onDraft={setDraft}
        />
        </div>
        <aside className={cn("order-3 rounded-2xl border border-line bg-white p-4 lg:order-none", mobile === "properties" ? "block" : "hidden", "lg:block")}>
          <EditorProperties
            snapshot={snapshot}
            onPlacement={editor.placeBackground}
            onRotation={editor.changeRotation}
            onResize={editor.resize}
            onToggleLock={editor.toggleLock}
            onShadow={editor.updateShadow}
            onMatchScene={editor.setMatchScene}
          />
        </aside>
      </div>
      {exportOpen ? (
        <ExportDialog
          transparent={snapshot.background.type === "transparent"}
          width={snapshot.width}
          height={snapshot.height}
          busy={editor.exporting}
          error={editor.exportError}
          onClose={() => setExportOpen(false)}
          onExport={(format, mode) => void editor.exportImage(format, mode)}
        />
      ) : null}
    </section>
  );
}

function fullFrame(crop: CropNorm): boolean {
  return crop.x <= 0.001 && crop.y <= 0.001 && crop.width >= 0.999 && crop.height >= 0.999;
}
