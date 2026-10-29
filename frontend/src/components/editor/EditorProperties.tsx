import { presetById } from "../../data/backgroundPresets";
import type { BackgroundFit, EditorSnapshot, ShadowSettings } from "../../types/editor";
import { Button } from "../common/Button";

type EditorPropertiesProps = {
  snapshot: EditorSnapshot;
  onPlacement: (patch: Partial<{ fit: BackgroundFit; scale: number; offsetX: number; offsetY: number }>, mode: "stage" | "commit") => void;
  onRotation: (value: number, mode?: "stage" | "commit") => void;
  onResize: (edge: "width" | "height", value: number) => void;
  onToggleLock: () => void;
  onShadow: (patch: Partial<ShadowSettings>, mode: "stage" | "commit") => void;
  onMatchScene: (enabled: boolean) => void;
};

export function EditorProperties(props: EditorPropertiesProps) {
  const { snapshot } = props;
  const background = snapshot.background;
  const photo = background.type === "image" && background.presetId ? presetById(background.presetId) : undefined;
  const label =
    background.type === "transparent"
      ? "Transparent"
      : background.type === "color"
        ? background.color
        : background.type === "gradient"
          ? "Gradient"
          : photo?.label ?? "Custom background";

  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="font-semibold">Background</h3>
        <p className="mt-1 text-muted">{label}</p>
        {photo ? (
          <p className="mt-2 text-xs leading-5 text-muted">
            Photo by {photo.author}.{" "}
            {photo.licenseUrl ? (
              <a className="underline" href={photo.licenseUrl} target="_blank" rel="noreferrer">
                {photo.license}
              </a>
            ) : (
              photo.license
            )}
            {" · "}
            <a className="underline" href={photo.sourceUrl} target="_blank" rel="noreferrer">
              Wikimedia Commons
            </a>
          </p>
        ) : null}
        {background.type === "image" ? (
          <div className="mt-3 space-y-3">
            <label className="block">
              Fit
              <select
                aria-label="Background fit"
                className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2"
                value={background.fit}
                onChange={(event) => props.onPlacement({ fit: event.target.value as BackgroundFit }, "commit")}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="center">Center</option>
              </select>
            </label>
            <Range label="Background zoom" min={0.5} max={3} step={0.05} value={background.scale} onChange={(value, mode) => props.onPlacement({ scale: value }, mode)} />
            <Range label="Horizontal position" min={-1} max={1} step={0.02} value={background.offsetX} onChange={(value, mode) => props.onPlacement({ offsetX: value }, mode)} />
            <Range label="Vertical position" min={-1} max={1} step={0.02} value={background.offsetY} onChange={(value, mode) => props.onPlacement({ offsetY: value }, mode)} />
          </div>
        ) : null}
      </section>
      <section>
        <h3 className="font-semibold">Shadow</h3>
        <button
          type="button"
          aria-pressed={snapshot.shadow.enabled}
          className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-left text-sm font-medium"
          onClick={() => props.onShadow({ enabled: !snapshot.shadow.enabled }, "commit")}
        >
          {snapshot.shadow.enabled ? "Contact shadow on" : "Contact shadow off"}
        </button>
        {snapshot.shadow.enabled ? (
          <div className="mt-3 space-y-3">
            <Range label="Shadow intensity" min={0.05} max={0.8} step={0.01} value={snapshot.shadow.intensity} onChange={(value, mode) => props.onShadow({ intensity: value }, mode)} />
            <Range label="Shadow blur" min={0} max={80} step={1} value={snapshot.shadow.blur} onChange={(value, mode) => props.onShadow({ blur: value }, mode)} />
            <Range label="Shadow distance" min={0} max={80} step={1} value={snapshot.shadow.distance} onChange={(value, mode) => props.onShadow({ distance: value }, mode)} />
            <Range label="Shadow direction" min={0} max={360} step={1} value={snapshot.shadow.angle} onChange={(value, mode) => props.onShadow({ angle: value }, mode)} />
          </div>
        ) : null}
      </section>
      <section>
        <h3 className="font-semibold">Scene match</h3>
        <button
          type="button"
          aria-pressed={snapshot.matchScene}
          className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-left text-sm font-medium"
          onClick={() => props.onMatchScene(!snapshot.matchScene)}
        >
          {snapshot.matchScene ? "Lighting match on" : "Lighting match off"}
        </button>
        <p className="mt-2 text-xs leading-5 text-muted">A small brightness adjustment. Skin color and detail stay as they are.</p>
      </section>
      <section>
        <h3 className="font-semibold">Crop</h3>
        <p className="mt-1 text-muted">
          {snapshot.crop
            ? `${Math.round(snapshot.crop.width * 100)}% by ${Math.round(snapshot.crop.height * 100)}% of the frame`
            : "Full frame"}
          {snapshot.aspect !== "free" ? ` · ${snapshot.aspect}` : ""}
        </p>
      </section>
      <section>
        <h3 className="font-semibold">Rotation</h3>
        <label className="mt-2 block">
          Angle
          <input
            aria-label="Rotation"
            type="number"
            min={-180}
            max={180}
            value={snapshot.rotation}
            className="mt-1 w-full rounded-lg border border-line px-2 py-2"
            onChange={(event) => props.onRotation(Number(event.target.value) || 0)}
          />
        </label>
      </section>
      <SizeFields snapshot={snapshot} onResize={props.onResize} onToggleLock={props.onToggleLock} />
      <p className="text-xs leading-5 text-muted">PNG can stay transparent. JPG is flattened because it has no alpha channel.</p>
    </div>
  );
}

export function SizeFields({
  snapshot,
  onResize,
  onToggleLock,
}: {
  snapshot: EditorSnapshot;
  onResize: (edge: "width" | "height", value: number) => void;
  onToggleLock: () => void;
}) {
  return (
    <section>
      <h3 className="font-semibold">Output</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label>
          Width
          <input
            aria-label="Output width"
            type="number"
            min={1}
            max={4096}
            value={snapshot.width}
            className="mt-1 w-full rounded-lg border border-line px-2 py-2"
            onChange={(event) => onResize("width", Number(event.target.value))}
          />
        </label>
        <label>
          Height
          <input
            aria-label="Output height"
            type="number"
            min={1}
            max={4096}
            value={snapshot.height}
            className="mt-1 w-full rounded-lg border border-line px-2 py-2"
            onChange={(event) => onResize("height", Number(event.target.value))}
          />
        </label>
      </div>
      <Button variant="secondary" className="mt-2 w-full" aria-pressed={snapshot.lockAspect} onClick={onToggleLock}>
        {snapshot.lockAspect ? "Aspect locked" : "Aspect unlocked"}
      </Button>
    </section>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number, mode: "stage" | "commit") => void;
}) {
  return (
    <label className="block">
      {label}
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="mt-1 w-full"
        onChange={(event) => onChange(Number(event.target.value), "stage")}
        onPointerUp={(event) => onChange(Number(event.currentTarget.value), "commit")}
        onBlur={(event) => onChange(Number(event.currentTarget.value), "commit")}
        onKeyUp={(event) => onChange(Number(event.currentTarget.value), "commit")}
      />
    </label>
  );
}
