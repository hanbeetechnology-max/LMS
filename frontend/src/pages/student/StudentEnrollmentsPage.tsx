import { useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { CoursesIcon } from "../../components/landing/icons";

const ACTIVE = [
  { id: "1", course: "Intro to Design", section: "Section B", progress: 72 },
  { id: "2", course: "Data Structures", section: "Section A", progress: 45 },
  { id: "3", course: "UX Writing Basics", section: "Section A", progress: 0 },
];

const COMPLETED = [
  { course: "Public Speaking", section: "Section A", completedDate: "May 2025" },
  { course: "Intro to Statistics", section: "Section C", completedDate: "Dec 2024" },
];

export function StudentEnrollmentsPage() {
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <>
      <Seo title="My Enrollments" description="Your enrolled and completed sections on HanbeeLms." path="/student/enrollments" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">My Enrollments</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Sections you're currently enrolled in.</p>
      </Reveal>

      <StaggerGroup className="mt-8 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
        {ACTIVE.map((item) => (
          <StaggerItem key={item.course} y={12} className="flex items-center gap-4 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-violet-soft) text-(--color-violet)">
              <CoursesIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-(--color-ink)">{item.course}</p>
              <p className="text-xs text-(--color-mist)">{item.section}</p>
            </div>
            <div className="hidden w-32 shrink-0 sm:block">
              <div className="h-1.5 overflow-hidden rounded-full bg-(--color-line)">
                <div className="h-full rounded-full bg-(--color-teal)" style={{ width: `${item.progress}%` }} />
              </div>
              <p className="mt-1 text-right font-mono text-xs text-(--color-mist)">
                <CountUp value={`${item.progress}%`} />
              </p>
            </div>
            <Link
              to={`/student/courses/${item.id}/lessons/l1`}
              className="shrink-0 rounded-full bg-(--color-ink) px-4 py-1.5 text-xs font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
            >
              Continue
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowCompleted((v) => !v)}
          className="font-display text-lg font-semibold text-(--color-ink) transition-colors hover:text-(--color-violet)"
        >
          Completed {showCompleted ? "−" : "+"}
        </button>

        {showCompleted && (
          <StaggerGroup className="mt-4 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
            {COMPLETED.map((item) => (
              <StaggerItem key={item.course} y={12} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-cloud) text-(--color-slate)">
                  <CoursesIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--color-ink)">{item.course}</p>
                  <p className="text-xs text-(--color-mist)">{item.section}</p>
                </div>
                <span className="shrink-0 rounded-full bg-(--color-teal-soft) px-2.5 py-0.5 text-xs font-medium text-(--color-teal-deep)">
                  Completed {item.completedDate}
                </span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </>
  );
}
