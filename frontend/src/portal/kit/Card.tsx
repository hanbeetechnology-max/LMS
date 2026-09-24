import type { ReactNode } from "react";

export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={`rounded-2xl border border-(--color-line) bg-(--color-paper) ${padded ? "p-5" : ""} ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-(--color-slate)">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "neutral" }: { label: string; value: ReactNode; hint?: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const toneClass = { neutral: "text-(--color-ink)", good: "text-(--color-teal-deep)", warn: "text-(--color-amber-deep)", bad: "text-(--color-error)" }[tone];
  return (
    <Card>
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-(--color-mist)">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-(--color-slate)">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-(--color-line) px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-(--color-ink)">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-(--color-slate)">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center py-12 text-sm text-(--color-slate)">
      {label}
    </div>
  );
}

export function ErrorBlock({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-(--color-error)/30 bg-(--color-error-soft) px-5 py-4 text-sm text-(--color-error)">
      Something went wrong loading this.
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-3 font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}
