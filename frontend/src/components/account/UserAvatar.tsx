export function UserAvatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand-dark ${
        large ? "h-12 w-12 text-sm" : "h-8 w-8 text-xs"
      }`}
    >
      {initials || "?"}
    </span>
  );
}
