import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCourseStats, fetchCourseStudents, type CourseStats, type CourseStudentRow } from "../../lib/portalApi";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, formatDate, useAsync } from "../kit";
import { btn, Field, inputClass, ProgressBar } from "./ui";

type SortKey = "name" | "school" | "section" | "progress" | "status" | "kind";

function StudentsTable({ course }: { course: CourseStats }) {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync<CourseStudentRow[]>(() => fetchCourseStudents(course.courseId), [course.courseId]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const val = (r: CourseStudentRow): string | number => {
      switch (sort.key) {
        case "name": return r.fullName.toLowerCase();
        case "school": return (r.orgName ?? "Solo").toLowerCase();
        case "section": return r.sectionName.toLowerCase();
        case "progress": return r.completionPct;
        case "status": return r.status;
        case "kind": return r.isNew ? 0 : 1;
      }
    };
    return (data ?? [])
      .filter((r) => !q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.orgName ?? "solo").toLowerCase().includes(q))
      .sort((a, b) => {
        const av = val(a);
        const bv = val(b);
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
      });
  }, [data, query, sort]);

  const heads: { key: SortKey; label: string }[] = [
    { key: "name", label: "Student" },
    { key: "school", label: "School" },
    { key: "section", label: "Section" },
    { key: "progress", label: "Progress" },
    { key: "status", label: "Status" },
    { key: "kind", label: "New or returning" },
  ];

  return (
    <section aria-label={`Students in ${course.title}`} className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-(--color-ink)">
          Students in {course.title} <Badge>{data?.length ?? 0}</Badge>
        </h2>
        <div className="w-full sm:w-64">
          <Field label="Search students">{(id) => <input id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email or school" className={inputClass} />}</Field>
        </div>
      </div>
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState title={query ? "No student matches" : "No students yet"} body={query ? "Try a different search." : "Nobody is enrolled in this course."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-(--color-line)">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-(--color-line) bg-(--color-cloud)">
                {heads.map((h) => (
                  <th key={h.key} scope="col" aria-sort={sort.key === h.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">
                    <button type="button" onClick={() => setSort({ key: h.key, dir: sort.key === h.key && sort.dir === 1 ? -1 : 1 })} className="inline-flex min-h-8 items-center gap-1 hover:text-(--color-ink)">
                      {h.label}
                      <span aria-hidden="true">{sort.key === h.key ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const clickable = !!r.orgId && !r.isSolo;
                return (
                  <tr
                    key={r.enrollmentId}
                    onClick={clickable ? () => navigate(`/staff/schools/${r.orgId}`) : undefined}
                    className={`border-b border-(--color-line) last:border-b-0 ${clickable ? "cursor-pointer hover:bg-(--color-cloud)" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <span className="block font-medium text-(--color-ink)">{r.fullName}</span>
                      <span className="block text-xs text-(--color-mist)">{r.email}</span>
                    </td>
                    <td className="px-3 py-2 text-(--color-ink-soft)">
                      {r.isSolo || !r.orgName ? <Badge>Solo</Badge> : r.orgName}
                      {r.orgStatus && r.orgStatus !== "active" && <span className="ml-1"><StatusBadge status={r.orgStatus} /></span>}
                    </td>
                    <td className="px-3 py-2 text-(--color-ink-soft)">{r.sectionName}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProgressBar pct={r.completionPct} label={`${r.completed} of ${r.total} lessons`} />
                        <span className="whitespace-nowrap text-xs text-(--color-slate)">
                          {r.completed} of {r.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2">
                      {r.isNew ? <Badge tone="info">New</Badge> : <Badge>Returning</Badge>}
                      <span className="ml-2 text-xs text-(--color-mist)">since {formatDate(r.enrolledOn)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function CoursesPage() {
  const { data, loading, error, reload } = useAsync<CourseStats[]>(fetchCourseStats, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const all = data ?? [];
  const courses = showDrafts ? all : all.filter((c) => c.status !== "draft" || c.students > 0);
  const hiddenDrafts = all.length - courses.length;
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedId === null && courses.length > 0) setSelectedId((courses.find((c) => c.students > 0) ?? courses[0]).courseId);
  }, [courses, selectedId]);
  useEffect(() => {
    if (selectedId) tableRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);
  const selected = courses.find((c) => c.courseId === selectedId) ?? null;

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Pick a course to see who is enrolled and how they are doing."
        actions={
          <Link to="/staff/courses/new" className={btn.primary}>
            New course
          </Link>
        }
      />
      {(hiddenDrafts > 0 || showDrafts) && (
        <label className="mb-4 flex min-h-11 items-center gap-2 text-sm text-(--color-ink-soft)">
          <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} className="size-5" />
          Show empty draft courses{hiddenDrafts > 0 ? ` (${hiddenDrafts} hidden)` : ""}
        </label>
      )}
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : courses.length === 0 ? (
        <EmptyState title="No courses yet" body="Create the first course with the New course button." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const active = c.courseId === selectedId;
            return (
              <Card key={c.courseId} className={`flex flex-col gap-3 ${active ? "ring-2 ring-(--color-ink)" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base font-semibold text-(--color-ink)">{c.title}</h2>
                  <StatusBadge status={c.status} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-(--color-mist)">Students</dt>
                    <dd className="font-semibold text-(--color-ink)">{c.students}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-(--color-mist)">Avg. completion</dt>
                    <dd className="font-semibold text-(--color-ink)">{Math.round(c.avgCompletionPct)}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-(--color-mist)">New (14 days)</dt>
                    <dd className="font-semibold text-(--color-ink)">{c.newStudents}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button type="button" aria-pressed={active} aria-label={`${active ? "Hide" : "View"} students of ${c.title}`} onClick={() => setSelectedId(active ? null : c.courseId)} className={active ? btn.primary : btn.secondary}>
                    {active ? "Hide students" : "View students"}
                  </button>
                  <Link to={`/staff/courses/${c.courseId}/edit`} className={btn.secondary} aria-label={`Edit ${c.title}`}>
                    Edit
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <div ref={tableRef}>{selected && <StudentsTable key={selected.courseId} course={selected} />}</div>
    </>
  );
}
