import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Toast {
  id: string;
  message: string;
  variant: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, variant?: Toast["variant"]) => void;
  /**
   * A longer-lived toast with an "Undo" action — for the small set of
   * Manager-role flows (see docs/HANBEE_LMS_DESIGN_PLAN.md §4.6/§14) that
   * genuinely benefit from a reversible confirmation, not routine saves
   * elsewhere in the app, which keep the plain 3s showToast().
   */
  showUndoToast: (message: string, onUndo: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const showToast = useCallback((message: string, variant: Toast["variant"] = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => dismiss(id), 3000);
  }, []);

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant: "success", actionLabel: "Undo", onAction: onUndo }]);
    setTimeout(() => dismiss(id), 7000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 sm:left-auto sm:right-6 sm:translate-x-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-[0_20px_45px_-25px_rgba(0,0,0,0.4)] ${
                toast.variant === "error"
                  ? "bg-(--color-error) text-(--color-paper)"
                  : "bg-(--color-ink) text-(--color-paper)"
              }`}
              role="status"
            >
              {toast.message}
              {toast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    dismiss(toast.id);
                  }}
                  className="shrink-0 rounded-full bg-(--color-paper)/15 px-2.5 py-1 text-xs font-semibold underline-offset-2 hover:underline"
                >
                  {toast.actionLabel}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
