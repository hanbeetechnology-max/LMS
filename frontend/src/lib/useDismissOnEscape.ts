import { useEffect, type RefObject } from "react";

/**
 * Closes an open dropdown/menu on Escape and returns focus to its trigger.
 * Without this, a keyboard-only user who opens a menu (ProfileMenu, RowMenu)
 * has no way to dismiss it — the backdrop that closes it on click is
 * `tabIndex={-1}` and unreachable by keyboard, and tabbing past the last
 * item just moves focus into the page while the menu stays visually open.
 */
export function useDismissOnEscape(
  open: boolean,
  onClose: () => void,
  restoreFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        restoreFocusRef?.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, restoreFocusRef]);
}
