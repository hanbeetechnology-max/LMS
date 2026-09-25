import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export interface SlideTab {
  id: string;
  label: string;
}

/** The slide-style switcher (segmented control with a sliding pill). Used for
 *  the student wizard (Tournament | Learning) and the school overview tabs. */
export function SlideSwitcher({ tabs, value, onChange, label }: { tabs: SlideTab[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="relative inline-flex rounded-full border border-(--color-line) bg-(--color-card) p-1">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${active ? "text-(--color-paper)" : "text-(--color-slate) hover:text-(--color-ink)"}`}
          >
            {active && (
              <motion.span
                layoutId={`slide-pill-${label}`}
                className="absolute inset-0 -z-10 rounded-full bg-(--color-ink)"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Content that slides in from the side of the tab that was picked. */
export function SlidePanel({ panelKey, index, children }: { panelKey: string; index: number; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={index}>
      <motion.div
        key={panelKey}
        role="tabpanel"
        initial={{ opacity: 0, x: index === 0 ? -32 : 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: index === 0 ? 32 : -32 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
