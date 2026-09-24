import { useState } from "react";

/** Small modal confirm with an optional reason box. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  askReason = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  askReason?: boolean;
  busy?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl border border-(--color-line) bg-(--color-paper) p-6">
        <h2 className="font-display text-lg font-semibold text-(--color-ink)">{title}</h2>
        <p className="mt-2 text-sm text-(--color-slate)">{body}</p>
        {askReason && (
          <label className="mt-4 block text-sm text-(--color-ink)">
            Reason (optional)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm"
            />
          </label>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus onClick={onCancel} className="min-h-11 rounded-xl border border-(--color-line) px-4 text-sm font-medium text-(--color-ink)">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(reason.trim() || undefined)}
            className="min-h-11 rounded-xl bg-(--color-ink) px-4 text-sm font-semibold text-(--color-paper) disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export const actionButton =
  "min-h-11 rounded-xl border border-(--color-line) px-3 text-sm font-medium text-(--color-ink) hover:bg-(--color-cloud) disabled:opacity-50";
