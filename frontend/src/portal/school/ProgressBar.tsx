export function ProgressBar({ pct }: { pct: number }) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <span className="flex min-w-32 items-center gap-2">
      <span role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Progress" className="h-2 flex-1 overflow-hidden rounded-full bg-(--color-cloud)">
        <span className="block h-full rounded-full bg-(--color-teal-deep)" style={{ width: `${value}%` }} />
      </span>
      <span className="w-10 text-right text-xs tabular-nums text-(--color-slate)">{value}%</span>
    </span>
  );
}
