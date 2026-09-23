import { StaggerGroup, StaggerItem } from "../ui/Reveal";
import type { DayEntry } from "../../lib/mockStaffTimeTracking";

export function TimeLogTable({ history }: { history: DayEntry[] }) {
  return (
    <div>
      <div className="flex items-center gap-4 px-1 pb-2 text-xs font-medium uppercase tracking-wide text-(--color-mist)">
        <span className="min-w-0 flex-1">Date</span>
        <span className="hidden w-24 shrink-0 sm:block">Clock in</span>
        <span className="hidden w-24 shrink-0 sm:block">Clock out</span>
        <span className="w-16 shrink-0 text-right">Hours</span>
        <span className="w-20 shrink-0 text-right">Status</span>
      </div>
      <StaggerGroup className="flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
        {[...history].reverse().map((day) => (
          <StaggerItem key={day.date} y={8} className="flex items-center gap-4 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium text-(--color-ink-soft)">{day.date}</span>
            <span className="hidden w-24 shrink-0 font-mono text-xs text-(--color-slate) sm:block">{day.clockIn}</span>
            <span className="hidden w-24 shrink-0 font-mono text-xs text-(--color-slate) sm:block">{day.clockOut}</span>
            <span className="w-16 shrink-0 text-right font-mono text-xs text-(--color-mist)">{day.hoursWorked}h</span>
            <span className="w-20 shrink-0 text-right">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  day.onTime ? "bg-(--color-teal-soft) text-(--color-teal-deep)" : "bg-(--color-amber-soft) text-(--color-amber-deep)"
                }`}
              >
                {day.onTime ? "On time" : "Late"}
              </span>
            </span>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </div>
  );
}
