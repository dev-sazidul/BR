import { useEffect, useRef, useState } from "react";

import { cn } from "../../utils/cn";

type ComparisonSliderProps = {
  before: string;
  after: string;
  background: string | null;
};

export function ComparisonSlider({ before, after, background }: ComparisonSliderProps) {
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
    <div className="mx-auto w-fit max-w-full">
      <div
        ref={frameRef}
        className={cn("comparison-frame relative overflow-hidden rounded-2xl", background ? "" : "checkerboard")}
        style={background ? { backgroundColor: background } : undefined}
      >
        <img
          src={after}
          alt="Background removed"
          className="block h-auto max-h-[420px] w-auto max-w-full"
          onLoad={() => setWidth(frameRef.current?.clientWidth ?? 0)}
        />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img
            src={before}
            alt=""
            className="absolute left-0 top-0 h-full max-w-none"
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
          Cutout
        </span>
        <input
          className="comparison-range"
          type="range"
          min={0}
          max={100}
          value={position}
          aria-label="Compare the original image and the cutout"
          aria-valuetext={`${position} percent original`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
