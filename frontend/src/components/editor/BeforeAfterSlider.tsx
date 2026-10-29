import { useEffect, useRef, useState } from "react";

import { cn } from "../../utils/cn";

type BeforeAfterSliderProps = {
  before: string;
  after: string;
};

export function BeforeAfterSlider({ before, after }: BeforeAfterSliderProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [position, setPosition] = useState(50);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const measure = () => setWidth(frame.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [after]);

  return (
    <div
      ref={frameRef}
      className="comparison-frame relative mx-auto overflow-hidden rounded-2xl border border-line"
    >
      <img src={after} alt="Edited image" className="block max-h-[68vh] w-full object-contain" />
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={before}
          alt=""
          className="absolute left-0 top-0 h-full max-w-none object-contain"
          style={{ width: width ? `${width}px` : "100%" }}
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${position}%` }} aria-hidden="true">
        <div className="h-full w-0.5 -translate-x-1/2 bg-white shadow" />
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
        Original
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
        Edited
      </span>
      <input
        className={cn("comparison-range")}
        type="range"
        min={0}
        max={100}
        value={position}
        aria-label="Compare the original and edited image"
        aria-valuetext={`${position} percent original`}
        onChange={(event) => setPosition(Number(event.target.value))}
      />
    </div>
  );
}
