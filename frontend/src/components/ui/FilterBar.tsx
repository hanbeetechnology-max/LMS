interface FilterGroup {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  groups: FilterGroup[];
}

/**
 * One consistent chip-selection style across every group (active = ink/paper,
 * inactive = cloud/slate) so color stays reserved for what it already means
 * elsewhere (status pills, type badges) instead of one hue per filter row.
 */
export function FilterBar({ groups }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-wrap items-baseline gap-3">
          <span className="w-20 shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">{group.label}</span>
          <div className="flex flex-1 flex-wrap gap-1.5">
            {group.options.map((opt) => {
              const active = opt.value === group.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => group.onChange(opt.value)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                    active ? "bg-(--color-ink) text-(--color-paper)" : "bg-(--color-cloud) text-(--color-slate) hover:bg-(--color-line)"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
