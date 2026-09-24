import { useState } from "react";
import { Link } from "react-router-dom";
import { ScanToPayCard } from "../../components/ui/ScanToPayCard";
import { fetchPublishedCourses } from "../../lib/coursesApi";
import { fetchMyCourseProgress } from "../../lib/portalApi";
import { useToast } from "../../lib/ToastProvider";
import { applyForCourse, fetchCourseApplications } from "../../lib/tournamentPortalApi";
import { Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, formatDate, useAsync } from "../kit";
import { ProgressBar } from "./LmsOverviewPage";

export function LmsCoursesPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [mine, published, applications] = await Promise.all([fetchMyCourseProgress(), fetchPublishedCourses(), fetchCourseApplications()]);
    return { mine, published, applications };
  }, []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);

  async function apply(courseId: string) {
    setBusy(true);
    const id = await applyForCourse(courseId, declared);
    setBusy(false);
    if (id) {
      showToast("Application sent. HANBEE will check it.");
      setOpenId(null);
      setDeclared(false);
      reload();
    } else {
      showToast("You have already applied for this course, or it is not open to you.", "error");
    }
  }

  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock onRetry={reload} />;

  const enrolledIds = new Set(data.mine.map((c) => c.courseId));
  const appliedIds = new Set(data.applications.filter((a) => a.status !== "rejected").map((a) => a.courseId));
  const available = data.published.filter((c) => !enrolledIds.has(c.id));

  return (
    <>
      <PageHeader title="My courses" subtitle="Courses you are in and courses you can apply for." />

      <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Enrolled</h2>
      {data.mine.length === 0 ? (
        <EmptyState title="You are not enrolled in a course yet." body="HANBEE will add you, or you can apply below." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.mine.map((c) => (
            <Card key={c.enrollmentId}>
              <h3 className="font-display text-lg font-semibold text-(--color-ink)">{c.courseTitle}</h3>
              <p className="text-sm text-(--color-slate)">Section: {c.sectionName}</p>
              <div className="mt-3">
                <ProgressBar pct={c.completionPct} />
              </div>
              <p className="mt-2 text-xs text-(--color-mist)">
                {c.completed} of {c.total} completed ({Math.round(c.completionPct)}%)
              </p>
              <Link to={`/student/courses/${c.courseId}/lessons/l1`} className="mt-3 inline-block text-sm font-medium text-(--color-violet) underline">
                Open course
              </Link>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-(--color-ink)">Courses you can apply for</h2>
      {available.length === 0 ? (
        <EmptyState title="No other courses right now" body="New courses will show up here when HANBEE publishes them." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {available.map((c) => {
            const applied = appliedIds.has(c.id);
            const open = openId === c.id;
            return (
              <Card key={c.id}>
                <h3 className="font-display text-lg font-semibold text-(--color-ink)">{c.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-(--color-slate)">{c.description}</p>
                {applied ? (
                  <p className="mt-3 text-sm font-medium text-(--color-amber-deep)">Applied, waiting for HANBEE</p>
                ) : open ? (
                  <div className="mt-4 space-y-3">
                    <ScanToPayCard amountLabel="course fee" confirmed={declared} onConfirmedChange={setDeclared} />
                    <p className="text-xs text-(--color-slate)">Payment is optional for now. HANBEE verifies payment by hand.</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void apply(c.id)}
                        className="min-h-11 rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper) disabled:opacity-60"
                      >
                        {busy ? "Sending..." : "Send application"}
                      </button>
                      <button type="button" onClick={() => setOpenId(null)} className="min-h-11 rounded-full px-4 text-sm font-medium text-(--color-slate)">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(c.id);
                      setDeclared(false);
                    }}
                    className="mt-3 min-h-11 rounded-full border border-(--color-line) px-5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud)"
                  >
                    Apply
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {data.applications.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-(--color-ink)">Your applications</h2>
          <Card>
            <ul className="divide-y divide-(--color-line)">
              {data.applications.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium text-(--color-ink)">{a.courseTitle}</span>
                  <span className="flex items-center gap-3 text-(--color-slate)">
                    {formatDate(a.createdAt)}
                    <StatusBadge status={a.status} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
