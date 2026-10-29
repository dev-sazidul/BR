import { useMemo, useState } from "react";

import {
  NATURAL_BACKGROUNDS,
  NATURAL_CATEGORIES,
  type NaturalBackground,
  type NaturalCategory,
} from "../../data/backgroundPresets";
import { cn } from "../../utils/cn";
import { BackgroundColorPicker } from "./BackgroundColorPicker";

type BackgroundPresetGalleryProps = {
  activeId: string | null;
  transparent: boolean;
  customColor: string;
  onSelect: (preset: NaturalBackground) => void;
  onTransparent: () => void;
  onCustomUpload: () => void;
  onCustomColor: (color: string) => void;
};

export function BackgroundPresetGallery({
  activeId,
  transparent,
  customColor,
  onSelect,
  onTransparent,
  onCustomUpload,
  onCustomColor,
}: BackgroundPresetGalleryProps) {
  const [category, setCategory] = useState<NaturalCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      NATURAL_BACKGROUNDS.filter((preset) => {
        if (broken[preset.id]) return false;
        if (category !== "all" && preset.category !== category) return false;
        return needle.length === 0 || preset.label.toLowerCase().includes(needle);
      }),
    [broken, category, needle],
  );

  return (
    <div>
      <h3 className="text-sm font-semibold">Natural backgrounds</h3>
      <p className="mt-1 text-sm leading-6 text-muted">
        Realistic photographs sit behind the cutout. The subject keeps its transparency.
      </p>
      <label className="mt-3 block text-xs font-semibold" htmlFor="background-search">
        Search scenes
        <input
          id="background-search"
          value={query}
          placeholder="Garden, beach, studio…"
          className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm font-medium"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Background categories">
        <CategoryTab active={category === "all"} label="All" onClick={() => setCategory("all")} />
        {NATURAL_CATEGORIES.map((item) => (
          <CategoryTab key={item.id} active={category === item.id} label={item.label} onClick={() => setCategory(item.id)} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={transparent}
          className={cn(
            "rounded-xl border px-2 py-3 text-left text-xs font-semibold",
            transparent ? "border-brand ring-2 ring-brand" : "border-line",
          )}
          onClick={onTransparent}
        >
          <span className="checkerboard mb-2 block h-10 rounded-lg border border-line" />
          Transparent
        </button>
        <button
          type="button"
          aria-label="Custom background"
          className="rounded-xl border border-line px-2 py-3 text-left text-xs font-semibold"
          onClick={onCustomUpload}
        >
          <span aria-hidden="true" className="mb-2 flex h-10 items-center justify-center rounded-lg border border-dashed border-line text-[11px]">
            Your photo
          </span>
          Custom background
        </button>
      </div>
      <div className="mt-3 grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {visible.map((preset) => {
          const active = activeId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              className={cn(
                "overflow-hidden rounded-xl border text-left",
                active ? "border-brand ring-2 ring-brand" : "border-line",
              )}
              onClick={() => onSelect(preset)}
            >
              <img
                src={preset.thumb}
                alt=""
                width={210}
                height={140}
                loading="lazy"
                decoding="async"
                className="aspect-[3/2] w-full object-cover"
                onError={() => setBroken((current) => ({ ...current, [preset.id]: true }))}
              />
              <span className="block truncate px-2 py-1.5 text-xs font-medium">{preset.label}</span>
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? <p className="mt-3 text-sm text-muted">No scenes match that search.</p> : null}
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-xs font-semibold">Solid color</p>
        <BackgroundColorPicker custom={customColor} onCustom={onCustomColor} />
      </div>
    </div>
  );
}

function CategoryTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
        active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
