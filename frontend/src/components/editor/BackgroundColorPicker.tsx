import { useEffect, useState } from "react";

import { normalizeHex } from "../../utils/imageGeometry";

type BackgroundColorPickerProps = {
  custom: string;
  onCustom: (color: string) => void;
};

export function BackgroundColorPicker({ custom, onCustom }: BackgroundColorPickerProps) {
  const [hex, setHex] = useState(custom);

  useEffect(() => {
    setHex(custom);
  }, [custom]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={custom}
        aria-label="Custom background color"
        className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
        onChange={(event) => onCustom(event.target.value.toUpperCase())}
      />
      <input
        aria-label="Hex color"
        value={hex}
        className="w-full rounded-lg border border-line px-2 py-1.5 text-sm uppercase"
        onChange={(event) => setHex(event.target.value.toUpperCase())}
        onBlur={() => {
          const next = normalizeHex(hex);
          if (next) onCustom(next);
          else setHex(custom);
        }}
      />
    </div>
  );
}
