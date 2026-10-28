import type { ReactNode } from "react";

import type { AdPlacement } from "../../ads/adConfig";
import { cn } from "../../utils/cn";

const sizeClass = {
  banner: "min-h-[90px]",
  rectangle: "min-h-[250px]",
} as const;

type AdContainerProps = {
  placement: AdPlacement;
  size: keyof typeof sizeClass;
  children: ReactNode;
};

export function AdContainer({ placement, size, children }: AdContainerProps) {
  return (
    <aside
      className="mx-auto w-full min-w-0 max-w-6xl px-5"
      aria-label="Advertisement"
      data-ad-placement={placement}
    >
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">Advertisement</p>
      <div
        className={cn(
          "flex w-full min-w-0 max-w-full flex-col rounded-2xl border border-dashed border-line bg-white/70",
          sizeClass[size],
        )}
      >
        {children}
      </div>
    </aside>
  );
}
