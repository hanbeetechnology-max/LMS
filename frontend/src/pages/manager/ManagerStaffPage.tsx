import { useEffect, useState } from "react";
import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { TimeLogTable } from "../../components/app/TimeLogTable";
import { STAFF_DIRECTORY, staffWeeklyHours, staffOnTimeRate } from "../../lib/mockManagerStaff";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";

interface CourseOverview {
  id: string;
  title: string;
  ownerName: string;
  enrolled: number;
  completedLessons: number;
  totalLessons: number;
}

export function ManagerStaffPage() {
  const { authSource } = useAuth();
  const [selectedId, setSelectedId] = useState(STAFF_DIRECTORY[0].id);
  const selected = STAFF_DIRECTORY.find((s) => s.id === selectedId) ?? STAFF_DIRECTORY[0];
  const [courses, setCourses] = useState<CourseOverview[]>([]);
  const [courseError, setCourseError] = useState<string | null>(null);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase) return;
    Promise.all([
      supabase.from("courses").select("id, title, owner_id, profiles(full_name), modules(id, lessons(id)), sections(id, enrollments(id, status))"),
      supabase.from("lesson_completions").select("lesson_id, enrollment_id"),
    ])
      .then(([coursesResult, completionsResult]) => {
        if (coursesResult.error || completionsResult.error) {
          setCourseError("Couldn't load course oversight right now.");
          return;
        }
        const completions = completionsResult.data ?? [];
        setCourses(
          (coursesResult.data ?? []).map((course) => {
            const modules = (course.modules ?? []) as unknown as Array<{ id: string; lessons: Array<{ id: string }> }>;
            const lessons = modules.flatMap((module) => module.lessons ?? []);
            const sections = (course.sections ?? []) as unknown as Array<{ id: string; enrollments: Array<{ id: string; status: string }> }>;
            const enrollments = sections.flatMap((section) => section.enrollments ?? []).filter((enrollment) => enrollment.status === "active" || enrollment.status === "completed");
            const enrollmentIds = new Set(enrollments.map((enrollment) => enrollment.id));
            return {
              id: course.id,
              title: course.title,
              ownerName: (course.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unassigned",
              enrolled: enrollments.length,
              totalLessons: lessons.length,
              completedLessons: completions.filter((completion) => enrollmentIds.has(completion.enrollment_id)).length,
            };
          }),
        );
      })
      .catch(() => setCourseError("Couldn't load course oversight right now."));
  }, [authSource]);

  return (
    <>
      <Seo title="Staff" description="Time logs and performance across every staff member." path="/manager/staff" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Staff time &amp; performance</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">See every staff member's clock-in/out history and performance.</p>
      </Reveal>

      {authSource === "supabase" && (
        <Reveal delay={0.04} className="mt-6 rounded-2xl border border-(--color-line) p-6">
          <h3 className="font-display text-lg font-semibold text-(--color-ink)">Course completion oversight</h3>
          <p className="mt-1 text-sm text-(--color-slate)">Live progress across courses and instructors.</p>
          {courseError ? (
            <p role="alert" className="mt-4 text-sm text-(--color-error)">{courseError}</p>
          ) : courses.length === 0 ? (
            <p className="mt-4 text-sm text-(--color-mist)">No live courses found.</p>
          ) : (
            <div className="mt-4 flex flex-col divide-y divide-(--color-line)">
              {courses.map((course) => (
                <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-(--color-ink-soft)">{course.title}</p>
                    <p className="text-xs text-(--color-mist)">{course.ownerName} · {course.enrolled} enrolled</p>
                  </div>
                  <span className="rounded-full bg-(--color-teal-soft) px-2.5 py-1 text-xs font-medium text-(--color-teal-deep)">
                    {course.completedLessons} lesson completions / {course.totalLessons} lessons
                  </span>
                </div>
              ))}
            </div>
          )}
        </Reveal>
      )}

      <Reveal delay={0.06} className="mt-6 flex flex-wrap gap-2">
        {STAFF_DIRECTORY.map((staff) => (
          <button
            key={staff.id}
            type="button"
            onClick={() => setSelectedId(staff.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
              selectedId === staff.id ? "bg-(--color-ink) text-(--color-paper)" : "bg-(--color-cloud) text-(--color-ink-soft) hover:bg-(--color-line)"
            }`}
          >
            {staff.name}
          </button>
        ))}
      </Reveal>

      <div key={selected.id}>
        <Reveal delay={0.08} className="mt-6 rounded-2xl border border-(--color-line) p-6">
          <p className="text-sm text-(--color-mist)">{selected.role}</p>
          <div className="mt-4 grid grid-cols-3 gap-6">
            <div>
              <dd className="font-display text-2xl font-semibold text-(--color-ink)">
                <CountUp value={`${staffWeeklyHours(selected).toFixed(1)}h`} delay={0.1} />
              </dd>
              <p className="mt-0.5 text-xs text-(--color-mist)">this week</p>
            </div>
            <div>
              <dd className="font-display text-2xl font-semibold text-(--color-ink)">
                <CountUp value={`${staffOnTimeRate(selected)}%`} delay={0.15} />
              </dd>
              <p className="mt-0.5 text-xs text-(--color-mist)">on-time rate</p>
            </div>
            <div>
              <dd className="font-display text-2xl font-semibold text-(--color-ink)">
                <CountUp value={`${selected.taskCompletion}%`} delay={0.2} />
              </dd>
              <p className="mt-0.5 text-xs text-(--color-mist)">tasks completed</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6 rounded-2xl border border-(--color-line) p-6">
          <h3 className="font-display text-lg font-semibold text-(--color-ink)">Time log</h3>
          <div className="mt-4">
            <TimeLogTable history={selected.history} />
          </div>
        </Reveal>
      </div>
    </>
  );
}
