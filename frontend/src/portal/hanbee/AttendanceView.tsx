import { useMemo, useState } from "react";
import { fetchStaffAttendance, fetchWorkSettings, workRuleLine, type AttendanceDay, type AttendanceStatus } from "../../lib/staffAttendanceApi";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, StatCard, formatTime, useAsync, type BadgeTone } from "../kit";
import { btn } from "./ui";

const TONE: Record<AttendanceStatus, BadgeTone> = { present: "good", late: "warn", absent: "bad", holiday: "info", off: "neutral", today: "neutral", upcoming: "neutral" };
const CELL: Record<AttendanceStatus, string> = {
  present: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  late: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  absent: "bg-(--color-error-soft) text-(--color-error)",
  holiday: "bg-(--color-violet-soft) text-(--color-violet)",
  off: "bg-(--color-cloud) text-(--color-mist)",
  upcoming: "bg-(--color-cloud) text-(--color-mist)",
  today: "border-2 border-(--color-ink) bg-(--color-card) text-(--color-ink)",
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function fmtHours(h: number): string {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}h ${pad(total % 60)}m`;
}

function weekday(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function StatusPill({ day }: { day: AttendanceDay }) {
  const label = day.status === "holiday" && day.holidayName ? `Holiday: ${day.holidayName}` : day.status;
  const worked = day.status !== "holiday" && day.holidayName;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={TONE[day.status]}>{label}</Badge>
      {worked && <Badge tone="info">Holiday: {day.holidayName}</Badge>}
    </span>
  );
}

export function AttendanceView({ staffId }: { staffId: string | null }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const from = iso(ym.y, ym.m, 1);
  const to = iso(ym.y, ym.m, new Date(ym.y, ym.m + 1, 0).getDate());
  const { data, loading, error, reload } = useAsync(() => fetchStaffAttendance(staffId, from, to), [staffId, from]);
  const settings = useAsync(fetchWorkSettings, []);

  const stats = useMemo(() => {
    const days = data ?? [];
    const worked = days.filter((d) => d.clockIn);
    const total = days.reduce((s, d) => s + d.hours, 0);
    return {
      present: days.filter((d) => d.status === "present" || d.status === "late").length,
      late: days.filter((d) => d.status === "late").length,
      absent: days.filter((d) => d.status === "absent").length,
      total,
      avg: worked.length ? total / worked.length : 0,
    };
  }, [data]);

  const step = (delta: number) => setYm((c) => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const label = new Date(ym.y, ym.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const rows = [...(data ?? [])].reverse();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" className={btn.secondary} onClick={() => step(-1)} aria-label="Previous month">Previous</button>
        <h2 className="min-w-36 text-center text-base font-semibold text-(--color-ink)" data-testid="month-label" aria-live="polite">{label}</h2>
        <button type="button" className={btn.secondary} onClick={() => step(1)} aria-label="Next month">Next</button>
        <p className="w-full text-sm text-(--color-slate) sm:ml-auto sm:w-auto" data-testid="work-rule">
          {settings.data ? workRuleLine(settings.data) : "Working hours unavailable"}
        </p>
      </div>
      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="attendance-stats">
            <StatCard label="Days present" value={stats.present} tone="good" />
            <StatCard label="Late days" value={stats.late} tone={stats.late ? "warn" : "neutral"} />
            <StatCard label="Absent days" value={stats.absent} tone={stats.absent ? "bad" : "neutral"} />
            <StatCard label="Total hours" value={fmtHours(stats.total)} />
            <StatCard label="Avg per worked day" value={fmtHours(stats.avg)} />
          </div>
          <Card className="mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Month at a glance</p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Days of the month">
              {[...data].reverse().map((d) => (
                <li key={d.workDate} title={`${weekday(d.workDate)}: ${d.status}`} className={`flex size-8 items-center justify-center rounded-md text-xs font-medium ${CELL[d.status]}`}>
                  <span aria-hidden="true">{Number(d.workDate.slice(8))}</span>
                  <span className="sr-only">{weekday(d.workDate)}, {d.status}</span>
                </li>
              ))}
            </ul>
          </Card>
          <div className="mt-4">
            {rows.length === 0 ? (
              <EmptyState title="No days to show" body="There is no record for this month." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-(--color-line) bg-(--color-card)">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm" data-testid="attendance-table">
                  <thead>
                    <tr className="border-b border-(--color-line) text-xs uppercase tracking-[0.08em] text-(--color-mist)">
                      {["Date", "Status", "Clock in", "Clock out", "Hours"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => (
                      <tr key={d.workDate} className="border-b border-(--color-line) last:border-b-0">
                        <td className="px-4 py-3 text-(--color-ink)">{weekday(d.workDate)}</td>
                        <td className="px-4 py-3"><StatusPill day={d} /></td>
                        <td className="px-4 py-3 tabular-nums">{formatTime(d.clockIn) || "-"}</td>
                        <td className="px-4 py-3 tabular-nums">{formatTime(d.clockOut) || "-"}</td>
                        <td className="px-4 py-3 tabular-nums">{d.hours ? fmtHours(d.hours) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
