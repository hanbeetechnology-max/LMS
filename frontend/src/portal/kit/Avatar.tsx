import { initials } from "./format";

const SWATCHES = [
  "bg-(--color-violet-soft) text-(--color-violet)",
  "bg-(--color-teal-soft) text-(--color-teal-deep)",
  "bg-(--color-amber-soft) text-(--color-amber-deep)",
  "bg-(--color-cloud) text-(--color-ink-soft)",
];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const swatch = SWATCHES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % SWATCHES.length];
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${swatch}`}
    >
      {initials(name)}
    </span>
  );
}
