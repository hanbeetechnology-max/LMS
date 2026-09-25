import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/* Small shared pieces for the Hanbee staff screens. */

export const btn = {
  primary:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-accent) px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
  secondary:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-line) bg-(--color-paper) px-5 text-sm font-semibold text-(--color-ink) transition-colors hover:bg-(--color-cloud) disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)",
  danger:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-error)/40 bg-(--color-error-soft) px-5 text-sm font-semibold text-(--color-error) transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-error)",
};

export const inputClass =
  "min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) placeholder:text-(--color-mist) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--color-accent)";

export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-(--color-slate)">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

export const REFUSED = "The server refused this. Check the details, your access and the current status, then try again.";

/** Confirmation dialog with an optional reason box. Shows a refusal inline. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger = false,
  askReason = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  askReason?: boolean;
  /** Return an error message to show, or null when it worked (dialog closes). */
  onConfirm: (reason: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function go() {
    setBusy(true);
    setError(null);
    const message = await onConfirm(reason.trim());
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl border border-(--color-line) bg-(--color-paper) p-6 shadow-xl">
        <h2 id={titleId} className="font-display text-lg font-semibold text-(--color-ink)">
          {title}
        </h2>
        <div className="mt-2 text-sm text-(--color-slate)">{body}</div>
        {askReason && (
          <div className="mt-4">
            <Field label="Reason (optional)">
              {(id) => <textarea id={id} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} py-2`} />}
            </Field>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-(--color-error-soft) px-3 py-2 text-sm text-(--color-error)">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" className={btn.secondary} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={danger ? btn.danger : btn.primary} onClick={go} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="flex items-center gap-2" title={label}>
      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-(--color-cloud)" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
        <div className="h-full rounded-full bg-(--color-accent)" style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs tabular-nums text-(--color-slate)">{v}%</span>
    </div>
  );
}

export function countOf(rec: Record<string, number> | undefined, key: string): number {
  return rec?.[key] ?? 0;
}
