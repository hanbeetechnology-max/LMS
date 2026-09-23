import { useMemo, useState } from "react";
import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";
import { useToast } from "../../lib/ToastProvider";
import { INITIAL_HOLIDAYS, SCOPE_LABEL, type Holiday, type HolidayScope } from "../../lib/mockHolidays";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DOT_STYLES: Record<HolidayScope, string> = {
  staff: "bg-(--color-violet)",
  students: "bg-(--color-teal)",
  center: "bg-(--color-amber)",
};

function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthGrid(year: number, month: number): (Date | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ManagerHolidaysPage() {
  const { showToast } = useToast();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [holidays, setHolidays] = useState(INITIAL_HOLIDAYS);
  const [tab, setTab] = useState<"staff" | "students">("staff");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<HolidayScope>("center");
  const [alsoCloseSections, setAlsoCloseSections] = useState(false);

  const cells = useMemo(() => monthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const visibleHolidays = holidays.filter((h) => h.scope === "center" || h.scope === tab);
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const h of visibleHolidays) {
      map.set(h.date, [...(map.get(h.date) ?? []), h]);
    }
    return map;
  }, [visibleHolidays]);

  const selectedDayHolidays = selectedDate ? (holidaysByDate.get(selectedDate) ?? []) : [];

  function changeMonth(delta: number) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedDate(null);
  }

  function addHoliday() {
    if (!selectedDate || !name.trim()) return;
    const newHoliday: Holiday = { id: crypto.randomUUID(), name: name.trim(), date: selectedDate, scope };
    const additions = [newHoliday];
    if (scope === "staff" && alsoCloseSections) {
      additions.push({ id: crypto.randomUUID(), name: `${name.trim()} (sections closed)`, date: selectedDate, scope: "students" });
    }
    setHolidays((prev) => [...prev, ...additions]);
    showToast(
      additions.length > 1
        ? `"${name.trim()}" added — affected sections closed for students too.`
        : `"${name.trim()}" added.`,
    );
    setName("");
    setScope("center");
    setAlsoCloseSections(false);
  }

  function removeHoliday(id: string) {
    const holiday = holidays.find((h) => h.id === id);
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    if (holiday) showToast(`"${holiday.name}" removed.`);
  }

  return (
    <>
      <Seo title="Holidays" description="Manage the center-wide holiday calendar." path="/manager/holidays" />

      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Holidays</h2>
          <p className="mt-1 text-[15px] text-(--color-slate)">Add and manage staff and student holidays.</p>
        </div>
        <div className="flex gap-2">
          {(["staff", "students"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-200 ${
                tab === t ? "bg-(--color-ink) text-(--color-paper)" : "bg-(--color-cloud) text-(--color-ink-soft) hover:bg-(--color-line)"
              }`}
            >
              {t} Holidays
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.06} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-lg px-2 py-1 text-(--color-ink-soft) hover:bg-(--color-cloud)">
            ←
          </button>
          <p className="font-display text-lg font-semibold text-(--color-ink)">{monthLabel}</p>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-lg px-2 py-1 text-(--color-ink-soft) hover:bg-(--color-cloud)">
            →
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center font-mono text-[11px] uppercase text-(--color-mist)">
          {WEEKDAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="aspect-square" />;
            const iso = toLocalISODate(date);
            const dayHolidays = holidaysByDate.get(iso) ?? [];
            const isSelected = selectedDate === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                title={dayHolidays.map((h) => h.name).join(", ")}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors ${
                  isSelected ? "bg-(--color-violet-soft) text-(--color-violet)" : "text-(--color-ink-soft) hover:bg-(--color-cloud)"
                }`}
              >
                {date.getDate()}
                {dayHolidays.length > 0 && (
                  <span className="flex gap-0.5">
                    {dayHolidays.slice(0, 3).map((h) => (
                      <span key={h.id} className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[h.scope]}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Reveal>

      {selectedDate && (
        <Reveal delay={0.08} className="mt-6 rounded-2xl border border-(--color-line) p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-(--color-ink)">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              aria-label="Close"
              className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded-lg text-(--color-mist) hover:bg-(--color-cloud) hover:text-(--color-ink)"
            >
              ×
            </button>
          </div>

          {selectedDayHolidays.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {selectedDayHolidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 rounded-xl bg-(--color-cloud) px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[h.scope]}`} />
                    {h.name} <span className="text-xs text-(--color-mist)">· {SCOPE_LABEL[h.scope]}</span>
                  </span>
                  <button type="button" onClick={() => removeHoliday(h.id)} className="text-xs font-medium text-(--color-error) hover:text-(--color-error)/80">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="holiday-name" className="text-xs font-medium text-(--color-ink-soft)">
                Add a holiday
              </label>
              <input
                id="holiday-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Holiday name"
                className="mt-1 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-sm text-(--color-ink) outline-none transition-colors focus:border-(--color-violet)"
              />
            </div>
            <div>
              <label htmlFor="holiday-scope" className="text-xs font-medium text-(--color-ink-soft)">
                Scope
              </label>
              <select
                id="holiday-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as HolidayScope)}
                className="mt-1 rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-sm text-(--color-ink-soft) outline-none transition-colors focus:border-(--color-violet)"
              >
                <option value="center">Center-wide</option>
                <option value="staff">Staff only</option>
                <option value="students">Students only</option>
              </select>
            </div>
            <button
              type="button"
              onClick={addHoliday}
              disabled={!name.trim()}
              className="rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
            >
              Add holiday
            </button>
          </div>

          {scope === "staff" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-(--color-ink-soft)">
              <input
                type="checkbox"
                checked={alsoCloseSections}
                onChange={(e) => setAlsoCloseSections(e.target.checked)}
                className="h-4 w-4 rounded border-(--color-line) accent-(--color-violet)"
              />
              Also close affected sections for students on this day
            </label>
          )}
        </Reveal>
      )}
    </>
  );
}
