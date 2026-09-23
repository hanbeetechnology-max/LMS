interface ErrorFallbackProps {
  onReload: () => void;
}

export function ErrorFallback({ onReload }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--color-paper) px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-error-soft) text-(--color-error)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Something went wrong</h1>
      <p className="max-w-sm text-[15px] text-(--color-slate)">
        This page hit an unexpected error. Reloading usually fixes it — if it keeps happening, let us know what you
        were doing.
      </p>
      <button
        type="button"
        onClick={onReload}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
      >
        Reload page
      </button>
    </div>
  );
}
