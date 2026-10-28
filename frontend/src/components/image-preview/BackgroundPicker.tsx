type BackgroundPickerProps = {
  value: string | null;
  custom: string;
  disabled?: boolean;
  onChange: (value: string | null) => void;
  onCustom: (value: string) => void;
};

const presets = [
  { id: "transparent", label: "Transparent", value: null },
  { id: "white", label: "White", value: "#FFFFFF" },
  { id: "black", label: "Black", value: "#000000" },
] as const;

export function BackgroundPicker({ value, custom, disabled = false, onChange, onCustom }: BackgroundPickerProps) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="text-sm font-medium text-ink">Preview background</legend>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const selected = value === preset.value;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                selected ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-ink"
              }`}
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
            </button>
          );
        })}
        <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
          Custom
          <input
            type="color"
            value={custom}
            aria-label="Custom background color"
            className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            onChange={(event) => {
              onCustom(event.target.value);
              onChange(event.target.value);
            }}
          />
        </label>
      </div>
      <p className="mt-2 text-sm text-muted">
        PNG downloads stay transparent. JPG uses this color, or white when Transparent is selected.
      </p>
    </fieldset>
  );
}
