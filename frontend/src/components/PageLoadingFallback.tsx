export function PageLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-paper)">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-(--color-line) border-t-(--color-violet)" />
    </div>
  );
}
