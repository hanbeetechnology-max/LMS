import { useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { TWO_WEEK_HISTORY, weeklyHoursTotal, onTimeRate } from "../../lib/mockStaffTimeTracking";
import { INITIAL_TASKS, taskCompletionRate } from "../../lib/mockStaffTasks";
import { TimeLogTable } from "../../components/app/TimeLogTable";

const CHART_HEIGHT = 120;

function HoursChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...TWO_WEEK_HISTORY.map((d) => d.hoursWorked));

  return (
    <div>
      <div className="relative flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {TWO_WEEK_HISTORY.map((day, i) => {
          const barHeight = Math.max((day.hoursWorked / max) * CHART_HEIGHT, 4);
          return (
            <div key={day.date} className="relative flex min-w-0 flex-1 flex-col items-center justify-end">
              {hovered === i && (
                <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-(--color-ink) px-2.5 py-1 text-xs font-medium text-(--color-paper)">
                  {day.hoursWorked}h
                </div>
              )}
              <button
                type="button"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                aria-label={`${day.date}: ${day.hoursWorked} hours worked${day.onTime ? "" : ", clocked in late"}`}
                className={`w-full rounded-t-md transition-colors duration-150 ${
                  hovered === i ? "bg-(--color-teal-deep)" : "bg-(--color-teal)"
                }`}
                style={{ height: barHeight }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 border-t border-(--color-line) pt-2">
        {TWO_WEEK_HISTORY.map((day) => (
          <span key={day.date} className="min-w-0 flex-1 truncate text-center font-mono text-[10px] text-(--color-mist)">
            {day.date.split(", ")[1]}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Hours worked per day, last two weeks</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Hours worked</th>
            <th>On time</th>
          </tr>
        </thead>
        <tbody>
          {TWO_WEEK_HISTORY.map((day) => (
            <tr key={day.date}>
              <td>{day.date}</td>
              <td>{day.hoursWorked}</td>
              <td>{day.onTime ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StaffPerformancePage() {
  const openTasks = INITIAL_TASKS.filter((t) => !t.done);
  const completedTasks = INITIAL_TASKS.filter((t) => t.done);

  return (
    <>
      <Seo title="Your performance" description="Your time, attendance, and task completion." path="/staff/performance" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Your performance</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">
          Self-service — visible only to you. Combines your time clock and task history.
        </p>
      </Reveal>

      <Reveal delay={0.05} className="mt-6 grid grid-cols-2 gap-6 rounded-2xl border border-(--color-line) p-6 sm:grid-cols-3">
        <div>
          <dd className="font-display text-2xl font-semibold text-(--color-ink)">
            <CountUp value={`${weeklyHoursTotal().toFixed(1)}h`} delay={0.1} />
          </dd>
          <p className="mt-0.5 text-xs text-(--color-mist)">this week</p>
        </div>
        <div>
          <dd className="font-display text-2xl font-semibold text-(--color-ink)">
            <CountUp value={`${onTimeRate()}%`} delay={0.15} />
          </dd>
          <p className="mt-0.5 text-xs text-(--color-mist)">on-time rate</p>
        </div>
        <div>
          <dd className="font-display text-2xl font-semibold text-(--color-ink)">
            <CountUp value={`${taskCompletionRate()}%`} delay={0.2} />
          </dd>
          <p className="mt-0.5 text-xs text-(--color-mist)">tasks completed</p>
        </div>
      </Reveal>

      <Reveal delay={0.08} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">Hours worked, last two weeks</h3>
        <div className="mt-5">
          <HoursChart />
        </div>
      </Reveal>

      <Reveal delay={0.09} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">Time log</h3>
        <p className="mt-1 text-sm text-(--color-slate)">Your clock-in/out record for the last two weeks.</p>
        <div className="mt-4">
          <TimeLogTable history={TWO_WEEK_HISTORY} />
        </div>
      </Reveal>

      <Reveal delay={0.1} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-(--color-ink)">Tasks</h3>
          <Link to="/staff/dashboard" className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">
            Manage on dashboard →
          </Link>
        </div>
        <StaggerGroup className="mt-4 flex flex-col divide-y divide-(--color-line)">
          {openTasks.map((task) => (
            <StaggerItem key={task.id} y={8} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-(--color-ink-soft)">{task.title}</span>
              <span className="shrink-0 font-mono text-xs text-(--color-mist)">{task.dueDate}</span>
            </StaggerItem>
          ))}
          {completedTasks.map((task) => (
            <StaggerItem key={task.id} y={8} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-(--color-mist) line-through">{task.title}</span>
              <span className="shrink-0 rounded-full bg-(--color-teal-soft) px-2 py-0.5 text-xs font-medium text-(--color-teal-deep)">
                Done
              </span>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Reveal>
    </>
  );
}
