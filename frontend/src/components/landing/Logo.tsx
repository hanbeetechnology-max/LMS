export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-ink) font-mono text-sm font-bold text-(--color-paper)">
        H
      </span>
      <span className="font-mono text-[15px] font-medium uppercase tracking-[0.16em] text-(--color-ink)">
        Hanbee<span className="text-(--color-violet)">Lms</span>
      </span>
    </span>
  );
}
