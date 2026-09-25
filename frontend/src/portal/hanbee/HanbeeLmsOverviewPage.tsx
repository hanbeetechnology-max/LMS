import { Link } from "react-router-dom";
import { AssessmentReviewPanel } from "../../components/app/AssessmentReviewPanel";
import { fetchCourseStats, fetchSiteLmsOverview, type CourseStats } from "../../lib/portalApi";
import { DataTable, ErrorBlock, LoadingBlock, PageHeader, StatCard, StatusBadge, useAsync, type Column } from "../kit";
import { countOf, ProgressBar } from "./ui";

export function HanbeeLmsOverviewPage() {
  const overview = useAsync(fetchSiteLmsOverview, []);
  const courses = useAsync<CourseStats[]>(fetchCourseStats, []);
  const o = overview.data;

  const columns: Column<CourseStats>[] = [
    { key: "title", header: "Course", sortValue: (r) => r.title.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.title}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "students", header: "Students", sortValue: (r) => r.students, render: (r) => r.students },
    { key: "avg", header: "Average completion", sortValue: (r) => r.avgCompletionPct, render: (r) => <ProgressBar pct={r.avgCompletionPct} /> },
    { key: "new", header: "New (14 days)", sortValue: (r) => r.newStudents, render: (r) => r.newStudents },
  ];

  return (
    <>
      <PageHeader
        title="LMS overview"
        subtitle="How learning is going across the whole platform."
        actions={
          <Link to="/staff/courses" className="inline-flex min-h-11 items-center rounded-full border border-(--color-line) px-5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud)">
            Go to courses
          </Link>
        }
      />
      {overview.loading && !o ? (
        <LoadingBlock />
      ) : overview.error ? (
        <ErrorBlock onRetry={overview.reload} />
      ) : o ? (
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Published courses" value={countOf(o.courses, "published")} tone="good" />
          <StatCard label="Draft courses" value={countOf(o.courses, "draft")} />
          <StatCard label="Archived courses" value={countOf(o.courses, "archived")} />
          <StatCard label="Applications pending" value={o.courseApplicationsPending} tone={o.courseApplicationsPending > 0 ? "warn" : "neutral"} />
          <StatCard label="Active students" value={o.students} />
          <StatCard label="Solo students" value={o.soloStudents} />
          <StatCard label="Enrollments" value={o.enrollments} />
          <StatCard label="Average completion" value={`${Math.round(o.avgCompletionPct)}%`} />
          <StatCard label="Schools active" value={countOf(o.schools, "active")} tone="good" />
          <StatCard label="Schools pending" value={countOf(o.schools, "pending")} tone={countOf(o.schools, "pending") > 0 ? "warn" : "neutral"} />
          <StatCard label="Schools suspended" value={countOf(o.schools, "suspended")} />
          <StatCard label="Schools closed" value={countOf(o.schools, "closed")} />
        </div>
      ) : null}

      <div className="mb-8 -mt-8">
        <AssessmentReviewPanel />
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Courses</h2>
      {courses.loading && !courses.data ? (
        <LoadingBlock />
      ) : courses.error ? (
        <ErrorBlock onRetry={courses.reload} />
      ) : (
        <DataTable columns={columns} rows={courses.data ?? []} rowKey={(r) => r.courseId} emptyTitle="No courses yet" emptyBody="Create one on the Courses page." />
      )}
    </>
  );
}
