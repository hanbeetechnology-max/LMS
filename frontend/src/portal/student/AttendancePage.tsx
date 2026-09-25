import { fetchMyAttendance, type AttendanceStatus, type MyAttendanceRow } from "../../lib/myAttendanceApi";
import { Badge, DataTable, ErrorBlock, LoadingBlock, PageHeader, StatCard, formatDate, useAsync, type BadgeTone } from "../kit";

const TONE: Record<AttendanceStatus, BadgeTone> = { present: "good", absent: "bad", late: "warn", excused: "neutral" };

export function AttendancePage() {
  const { data, loading, error, reload } = useAsync(fetchMyAttendance, []);
  const rows = data ?? [];
  const count = (s: AttendanceStatus) => rows.filter((r) => r.status === s).length;
  const attended = count("present") + count("late");
  const counted = rows.length - count("excused");
  const pct = counted > 0 ? Math.round((attended / counted) * 100) : 0;

  return (
    <>
      <PageHeader title="Attendance" subtitle="Your own attendance across your courses." />
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Attended" value={attended} hint="Present or late" />
            <StatCard label="Absent" value={count("absent")} tone={count("absent") > 0 ? "bad" : "neutral"} />
            <StatCard label="Late" value={count("late")} tone={count("late") > 0 ? "warn" : "neutral"} />
            <StatCard label="Attendance" value={`${pct}%`} hint="Excused sessions not counted" />
          </div>
          <DataTable<MyAttendanceRow>
            rows={rows}
            rowKey={(r) => r.id}
            emptyTitle="No sessions recorded yet."
            columns={[
              { key: "date", header: "Date", render: (r) => formatDate(r.sessionAt), sortValue: (r) => new Date(r.sessionAt).getTime() },
              {
                key: "course",
                header: "Course",
                render: (r) => (
                  <span className="text-(--color-ink)">
                    {r.courseTitle}
                    {r.sectionName && <span className="text-(--color-mist)"> / {r.sectionName}</span>}
                  </span>
                ),
              },
              { key: "status", header: "Status", render: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
              { key: "note", header: "Note", render: (r) => r.note || "-" },
            ]}
          />
        </div>
      )}
    </>
  );
}
