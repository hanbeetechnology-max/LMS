import { useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { fetchCourseStudents, fetchSchoolCourseParticipation } from "../../lib/portalApi";
import { ProgressBar } from "./ProgressBar";
import { Badge, Card, DataTable, ErrorBlock, LoadingBlock, PageHeader, relativeTime, useAsync } from "../kit";

export function SchoolCoursesPage() {
  const { profile } = useAuth();
  const orgId = profile?.school?.orgId ?? "";
  const [selected, setSelected] = useState<{ id: string; title: string } | null>(null);

  const courses = useAsync(() => fetchSchoolCourseParticipation(orgId), [orgId]);
  const students = useAsync(() => (selected ? fetchCourseStudents(selected.id) : Promise.resolve([])), [selected?.id]);

  return (
    <>
      <PageHeader title="Courses" subtitle="Which of your students take which course. This page is read-only." />
      {courses.loading ? (
        <LoadingBlock />
      ) : courses.error ? (
        <ErrorBlock onRetry={courses.reload} />
      ) : (
        <DataTable
          rows={courses.data ?? []}
          rowKey={(r) => r.courseId}
          onRowClick={(r) => setSelected({ id: r.courseId, title: r.title })}
          emptyTitle="No course activity yet"
          emptyBody="When your students enrol in courses they will show up here."
          columns={[
            {
              key: "title",
              header: "Course",
              sortValue: (r) => r.title,
              render: (r) => (
                <button type="button" onClick={() => setSelected({ id: r.courseId, title: r.title })} className="min-h-11 text-left font-medium text-(--color-violet) underline-offset-2 hover:underline">
                  {r.title}
                </button>
              ),
            },
            { key: "students", header: "Students", sortValue: (r) => r.students, render: (r) => r.students },
            { key: "avg", header: "Average completion", sortValue: (r) => r.avgCompletionPct, render: (r) => `${Math.round(r.avgCompletionPct)}%` },
          ]}
        />
      )}

      {selected && (
        <section className="mt-8" aria-label={`Students in ${selected.title}`}>
          <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Students in {selected.title}</h2>
          {students.loading ? (
            <LoadingBlock />
          ) : students.error ? (
            <ErrorBlock onRetry={students.reload} />
          ) : (
            <DataTable
              rows={students.data ?? []}
              rowKey={(r) => r.enrollmentId}
              emptyTitle="No students yet"
              emptyBody="None of your students are enrolled in this course."
              columns={[
                {
                  key: "name",
                  header: "Student",
                  sortValue: (r) => r.fullName,
                  render: (r) => (
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-(--color-ink)">{r.fullName}</span>
                      {r.isNew && <Badge tone="info">New</Badge>}
                    </span>
                  ),
                },
                { key: "section", header: "Section", sortValue: (r) => r.sectionName, render: (r) => r.sectionName },
                { key: "progress", header: "Progress", sortValue: (r) => r.completionPct, render: (r) => <ProgressBar pct={r.completionPct} /> },
                { key: "last", header: "Last activity", sortValue: (r) => r.lastActivity ?? "", render: (r) => relativeTime(r.lastActivity) },
              ]}
            />
          )}
        </section>
      )}
      {!selected && !courses.loading && (courses.data?.length ?? 0) > 0 && (
        <Card className="mt-6">
          <p className="text-sm text-(--color-slate)">Select a course to see which of your students take it.</p>
        </Card>
      )}
    </>
  );
}
