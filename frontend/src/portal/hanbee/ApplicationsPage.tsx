import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { decideCourseApplication, enrollStudent, fetchCourseApplications, type CourseApplication, type Decision } from "../../lib/tournamentPortalApi";
import { useToast } from "../../lib/ToastProvider";
import { Badge, Card, DataTable, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, formatDate, useAsync, type Column } from "../kit";
import { btn, ConfirmDialog, Field, inputClass, REFUSED } from "./ui";

interface SectionOption {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
}

async function fetchSections(courseId?: string): Promise<SectionOption[]> {
  if (!supabase) return [];
  let q = supabase.from("sections").select("id, name, course_id, courses(title)").order("name");
  if (courseId) q = q.eq("course_id", courseId);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as { id: string; name: string; course_id: string; courses: { title: string } | { title: string }[] | null }[]).map((r) => ({
    id: r.id,
    name: r.name,
    courseId: r.course_id,
    courseTitle: (Array.isArray(r.courses) ? r.courses[0]?.title : r.courses?.title) ?? "Course",
  }));
}

interface StudentHit {
  id: string;
  fullName: string;
  email: string;
}

async function searchStudents(term: string): Promise<StudentHit[]> {
  if (!supabase || term.trim().length < 2) return [];
  const t = term.trim().replace(/[%,()]/g, " ");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student")
    .or(`full_name.ilike.%${t}%,email.ilike.%${t}%`)
    .limit(8);
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id as string, fullName: r.full_name as string, email: r.email as string }));
}

function DecisionDialog({ app, kind, onClose, onDone }: { app: CourseApplication; kind: Decision; onClose: () => void; onDone: () => void }) {
  const { showToast } = useToast();
  const [sections, setSections] = useState<SectionOption[] | null>(null);
  const [sectionId, setSectionId] = useState("");

  useEffect(() => {
    if (kind !== "verified") return;
    fetchSections(app.courseId).then((s) => {
      setSections(s);
      if (s.length === 1) setSectionId(s[0].id);
    });
  }, [app.courseId, kind]);

  const approve = kind === "verified";
  return (
    <ConfirmDialog
      title={approve ? `Approve ${app.applicantName}?` : `Reject ${app.applicantName}?`}
      body={
        approve ? (
          <>
            <p>Choose the section for {app.courseTitle}. The student is enrolled at once.</p>
            {app.paymentDeclared && <p className="mt-2">Payment was only declared by the student. Make sure you have confirmed it.</p>}
            <div className="mt-3">
              <Field label="Section">
                {(id) =>
                  sections === null ? (
                    <p className="text-sm">Loading sections...</p>
                  ) : sections.length === 0 ? (
                    <p className="text-sm text-(--color-error)">This course has no section yet. Add one in the course editor first.</p>
                  ) : (
                    <select id={id} value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={inputClass}>
                      <option value="">Choose a section</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )
                }
              </Field>
            </div>
          </>
        ) : (
          "The application is rejected and the student is not enrolled."
        )
      }
      confirmLabel={approve ? "Approve and enroll" : "Reject application"}
      danger={!approve}
      onConfirm={async () => {
        if (approve && !sectionId) return "Choose a section first.";
        const ok = await decideCourseApplication(app.id, kind, approve ? sectionId : undefined);
        if (!ok) return REFUSED;
        showToast(approve ? "Application approved and student enrolled." : "Application rejected.");
        onDone();
        onClose();
        return null;
      }}
      onCancel={onClose}
    />
  );
}

function EnrollForm({ onDone }: { onDone: () => void }) {
  const { showToast } = useToast();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [student, setStudent] = useState<StudentHit | null>(null);
  const sections = useAsync<SectionOption[]>(() => fetchSections(), []);
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student) return;
    let live = true;
    const t = window.setTimeout(() => {
      searchStudents(term).then((h) => live && setHits(h));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [term, student]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!student) return setError("Search for a student and pick one.");
    if (!sectionId) return setError("Choose a course section.");
    setBusy(true);
    const id = await enrollStudent(student.id, sectionId);
    setBusy(false);
    if (!id) return setError("The database refused this enrollment. The student may already be enrolled, or their account or school is not active.");
    showToast(`${student.fullName} enrolled.`);
    setStudent(null);
    setTerm("");
    setHits([]);
    setSectionId("");
    onDone();
  }

  return (
    <Card className="mt-8">
      <h2 className="font-display text-lg font-semibold text-(--color-ink)">Enroll a student directly</h2>
      <p className="mt-1 text-sm text-(--color-slate)">Skips the application. The student is enrolled in the section you choose.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <Field label="Student (name or email)">
            {(id) => (
              <input
                id={id}
                value={student ? `${student.fullName} (${student.email})` : term}
                onChange={(e) => {
                  setStudent(null);
                  setTerm(e.target.value);
                }}
                placeholder="Type at least 2 letters"
                autoComplete="off"
                className={inputClass}
              />
            )}
          </Field>
          {!student && hits.length > 0 && (
            <ul className="mt-1 divide-y divide-(--color-line) overflow-hidden rounded-xl border border-(--color-line)">
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => setStudent(h)} className="min-h-11 w-full px-3 text-left text-sm hover:bg-(--color-cloud)">
                    {h.fullName} <span className="text-(--color-mist)">{h.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Field label="Course section">
          {(id) => (
            <select id={id} value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={inputClass}>
              <option value="">Choose a section</option>
              {(sections.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.courseTitle} - {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-(--color-error-soft) px-3 py-2 text-sm text-(--color-error) md:col-span-2">
            {error}
          </p>
        )}
        <div className="md:col-span-2">
          <button type="submit" disabled={busy} className={btn.primary}>
            {busy ? "Enrolling..." : "Enroll student"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export function ApplicationsPage() {
  const { data, loading, error, reload } = useAsync<CourseApplication[]>(fetchCourseApplications, []);
  const [dialog, setDialog] = useState<{ app: CourseApplication; kind: Decision } | null>(null);

  const columns: Column<CourseApplication>[] = [
    { key: "student", header: "Student", sortValue: (r) => r.applicantName.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.applicantName}</span> },
    { key: "course", header: "Course", sortValue: (r) => r.courseTitle.toLowerCase(), render: (r) => r.courseTitle },
    { key: "school", header: "School", sortValue: (r) => r.schoolName ?? "", render: (r) => r.schoolName ?? <Badge>Solo</Badge> },
    { key: "pay", header: "Payment", render: (r) => (r.paymentDeclared ? <Badge tone="warn">Declared (unverified claim)</Badge> : <span className="text-(--color-mist)">None</span>) },
    { key: "date", header: "Applied", sortValue: (r) => r.createdAt, render: (r) => formatDate(r.createdAt) },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "applied" || r.status === "payment_declared" ? (
          <div className="flex gap-1.5">
            <button type="button" className={`${btn.primary} px-3`} onClick={() => setDialog({ app: r, kind: "verified" })} aria-label={`Approve ${r.applicantName}`}>
              Approve
            </button>
            <button type="button" className={`${btn.danger} px-3`} onClick={() => setDialog({ app: r, kind: "rejected" })} aria-label={`Reject ${r.applicantName}`}>
              Reject
            </button>
          </div>
        ) : (
          <span className="text-(--color-mist)">Decided {formatDate(r.decidedAt)}</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Applications" subtitle="Students asking to join a course. Payment is only a claim you verify." />
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} emptyTitle="No applications" emptyBody="When a student applies for a course it shows up here." />
      )}
      <EnrollForm onDone={reload} />
      {dialog && <DecisionDialog app={dialog.app} kind={dialog.kind} onClose={() => setDialog(null)} onDone={reload} />}
    </>
  );
}
