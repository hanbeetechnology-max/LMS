import { Reveal } from "../../components/ui/Reveal";
import type { ComponentType } from "react";

interface ManagerPlaceholderPageProps {
  title: string;
  description: string;
  Icon: ComponentType;
  phaseNote: string;
}

// Phases B/C/D (see docs/HANBEE_LMS_DESIGN_PLAN.md §14) replace this with the
// real page. Linked from ManagerLayout's nav today so the sidebar has no dead
// ends while those phases are built — an honest "not built yet" state instead
// of a 404, matching this app's established empty-state conventions.
export function ManagerPlaceholderPage({ title, description, Icon, phaseNote }: ManagerPlaceholderPageProps) {
  return (
    <Reveal className="flex flex-col items-center gap-3 rounded-2xl border border-(--color-line) px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--color-violet-soft) text-(--color-violet)">
        <Icon />
      </span>
      <h2 className="font-display text-xl font-semibold text-(--color-ink)">{title}</h2>
      <p className="max-w-sm text-sm text-(--color-slate)">{description}</p>
      <p className="mt-2 text-xs text-(--color-mist)">{phaseNote}</p>
    </Reveal>
  );
}
