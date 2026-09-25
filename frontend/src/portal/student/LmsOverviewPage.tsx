import { Link } from "react-router-dom";
import { fetchMyCourseProgress } from "../../lib/portalApi";
import { Card, EmptyState, ErrorBlock, Eyebrow, LoadingBlock, PageHeader, StatCard, relativeTime, useAsync } from "../kit";
import { LatestAnnouncements, primaryBtn, textLink } from "./shared";

export function ProgressBar({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div role="progressbar" aria-label="Course progress" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-(--color-canvas)">
      <div className="h-full rounded-full bg-(--color-accent)" style={{ width: `${v}%` }} />
    </div>
  );
}

export function LmsOverviewPage() {
  const { data, loading, error, reload } = useAsync(fetchMyCourseProgress, []);
  const courses = data ?? [];
  const next = courses.find((c) => c.completionPct < 100) ?? courses[0];
  const lessonsDone = courses.reduce((n, c) => n + c.completed, 0);
  const avg = courses.length ? Math.round(courses.reduce((n, c) => n + c.completionPct, 0) / courses.length) : 0;
  const certificates = courses.filter((c) => c.completionPct >= 100).length;

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
              <Link to="/student/lms/courses" className={primaryBtn}>
                Browse courses
              </Link>
            }
          />
          <LatestAnnouncements />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Courses" value={courses.length} />
            <StatCard label="Lessons done" value={lessonsDone} />
            <StatCard label="Average progress" value={`${avg}%`} />
            <Link to="/student/lms/certificates" aria-label="Certificates, open the certificates page" className="block rounded-xl hover:opacity-90">
              <StatCard label="Certificates" value={certificates} />
            </Link>
          </div>

          {next && (
            <Card>
              <Eyebrow>Continue learning</Eyebrow>
              <h2 className="mt-2 text-xl font-semibold text-(--color-ink)">{next.courseTitle}</h2>
              <p className="mt-1 text-sm text-(--color-slate)">
                {next.completed} of {next.total} lessons done ({Math.round(next.completionPct)}%)
              </p>
              <div className="mt-3 max-w-md">
                <ProgressBar pct={next.completionPct} />
              </div>
              <Link to={`/student/courses/${next.courseId}/lessons/l1`} className={`mt-4 ${primaryBtn}`}>
                Continue learning
              </Link>
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {courses.map((c) => (
                <Card key={c.enrollmentId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-(--color-ink)">{c.courseTitle}</h3>
                      <p className="text-sm text-(--color-slate)">Section: {c.sectionName}</p>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums text-(--color-ink)">{Math.round(c.completionPct)}%</p>
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
                    <Link to={`/student/courses/${c.courseId}/certificate`} className={`mt-1 ${textLink}`}>
                      View certificate
                    </Link>
                  )}
                </Card>
              ))}
            </div>
            <LatestAnnouncements />
          </div>
        </div>
      )}
    </>
  );
}
