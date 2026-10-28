import { cn } from "../../utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin",
        className,
      )}
      aria-hidden="true"
    />
  );
}
