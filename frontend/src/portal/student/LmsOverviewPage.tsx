import { Link } from "react-router-dom";
import { fetchMyCourseProgress } from "../../lib/portalApi";
import { Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, relativeTime, useAsync } from "../kit";
import { LatestAnnouncements } from "./shared";

export function ProgressBar({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-(--color-cloud)">
      <div className="h-full rounded-full bg-(--color-violet)" style={{ width: `${v}%` }} />
    </div>
  );
}

export function LmsOverviewPage() {
  const { data, loading, error, reload } = useAsync(fetchMyCourseProgress, []);
  const courses = data ?? [];
  const next = courses.find((c) => c.completionPct < 100) ?? courses[0];

  return (
    <>
      <PageHeader title="Learning" subtitle="Your courses and progress." />
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : courses.length === 0 ? (
        <div className="space-y-5">
          <EmptyState
            title="You are not enrolled in a course yet."
            body="HANBEE will add you, or you can apply."
            action={
              <Link to="/student/lms/courses" className="inline-flex min-h-11 items-center rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper)">
                Browse courses
              </Link>
            }
          />
          <LatestAnnouncements />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {next && (
            <Card className="lg:col-span-3">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-(--color-mist)">Continue learning</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-(--color-ink)">{next.courseTitle}</h2>
              <p className="mt-1 text-sm text-(--color-slate)">
                {next.completed} of {next.total} lessons done ({Math.round(next.completionPct)}%)
              </p>
              <Link
                to={`/student/courses/${next.courseId}/lessons/l1`}
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-(--color-ink) px-6 text-sm font-semibold text-(--color-paper)"
              >
                Continue learning
              </Link>
            </Card>
          )}
          <div className="space-y-4 lg:col-span-2">
            {courses.map((c) => (
              <Card key={c.enrollmentId}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-(--color-ink)">{c.courseTitle}</h3>
                    <p className="text-sm text-(--color-slate)">Section: {c.sectionName}</p>
                  </div>
                  <p className="font-display text-2xl font-semibold text-(--color-ink)">{Math.round(c.completionPct)}%</p>
                </div>
                <div className="mt-3">
                  <ProgressBar pct={c.completionPct} />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-(--color-mist)">
                  <span>
                    {c.completed} of {c.total} completed
                  </span>
                  <span>Last activity: {relativeTime(c.lastActivity)}</span>
                </div>
                {c.completionPct >= 100 && (
                  <Link to={`/student/courses/${c.courseId}/certificate`} className="mt-3 inline-block text-sm font-medium text-(--color-violet) underline">
                    View certificate
                  </Link>
                )}
              </Card>
            ))}
          </div>
          <LatestAnnouncements />
        </div>
      )}
    </>
  );
}
