import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { AutoAttendancePanel } from "../../components/app/AutoAttendancePanel";

type Status = "present" | "absent" | "late" | "excused";

const STATUS_STYLES: Record<Status, string> = {
  present: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  absent: "bg-(--color-error-soft) text-(--color-error)",
  late: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  excused: "bg-(--color-cloud) text-(--color-slate)",
};

const HISTORY: { date: string; course: string; status: Status }[] = [
  { date: "Mon, Sep 8", course: "Intro to Design — Section B", status: "present" },
  { date: "Fri, Sep 5", course: "Data Structures", status: "present" },
  { date: "Wed, Sep 3", course: "Intro to Design — Section B", status: "late" },
  { date: "Mon, Sep 1", course: "Data Structures", status: "present" },
  { date: "Fri, Aug 29", course: "Intro to Design — Section B", status: "absent" },
  { date: "Wed, Aug 27", course: "Data Structures", status: "present" },
];

export function StudentAttendancePage() {
  const present = HISTORY.filter((h) => h.status === "present").length;
  const absent = HISTORY.filter((h) => h.status === "absent").length;
  const late = HISTORY.filter((h) => h.status === "late").length;
  const rate = Math.round((present / HISTORY.length) * 100);

  return (
    <>
      <Seo title="My Attendance" description="Your attendance history on HanbeeLms." path="/student/attendance" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">My Attendance</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Your attendance record across all courses.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-8 grid grid-cols-2 gap-6 border-b border-(--color-line) pb-8 sm:grid-cols-4">
        {[
          [`${rate}%`, "attendance rate"],
          [String(present), "present"],
          [String(absent), "absent"],
          [String(late), "late"],
        ].map(([value, label], i) => (
          <div key={label}>
            <dd className="font-display text-3xl font-semibold text-(--color-ink)">
              <CountUp value={value} delay={0.2 + i * 0.08} />
            </dd>
            <p className="mt-1 text-sm text-(--color-mist)">{label}</p>
          </div>
        ))}
      </Reveal>

      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">History</h3>
        <StaggerGroup className="mt-4 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
          {HISTORY.map((item, i) => (
            <StaggerItem key={i} y={12} className="flex items-center justify-between px-5 py-3.5 text-sm">
              <div>
                <p className="font-medium text-(--color-ink-soft)">{item.course}</p>
                <p className="text-xs text-(--color-mist)">{item.date}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[item.status]}`}>
                {item.status}
              </span>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>

      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">System sign-ins</h3>
        <p className="mt-1 text-sm text-(--color-mist)">
          Automatically tracked from your actual logins — present only counts once a session stays active a while, not just signing in.
        </p>
        <div className="mt-4">
          <AutoAttendancePanel scope="mine" />
        </div>
      </div>
    </>
  );
}
