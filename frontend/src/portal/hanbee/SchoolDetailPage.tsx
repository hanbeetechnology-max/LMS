import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  convertToSolo,
  fetchSchoolCourseParticipation,
  fetchSchoolOverview,
  fetchSchoolStudents,
  setAccountStatus,
  setSchoolStatus,
  type AccountStatus,
  type SchoolCourseParticipation,
  type SchoolStudent,
} from "../../lib/portalApi";
import { fetchTeams, type Team } from "../../lib/tournamentPortalApi";
import { useToast } from "../../lib/ToastProvider";
import { Badge, Card, DataTable, EmptyState, ErrorBlock, LoadingBlock, PageHeader, SlidePanel, SlideSwitcher, StatCard, StatusBadge, formatDate, formatDateTime, relativeTime, useAsync, type Column } from "../kit";
import { btn, ConfirmDialog, ProgressBar, REFUSED } from "./ui";
import { SchoolVerifyButtons } from "./SchoolVerifyButtons";

type StudentAction = { student: SchoolStudent; kind: "suspend" | "revoke" | "reactivate" | "solo" };
type SchoolAction = "suspended" | "active" | "closed";

const TABS = [
  { id: "tournament", label: "Tournament" },
  { id: "learning", label: "Learning" },
];

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-(--color-ink)">{children}</dd>
    </div>
  );
}

/** One school in full. Mounted at /staff/schools/:orgId and /manager/schools/:orgId. */
export function SchoolDetailPage() {
  const { orgId = "" } = useParams();
  const { pathname } = useLocation();
  const { showToast } = useToast();
  const base = pathname.startsWith("/manager") ? "/manager" : "/staff";
  const listPath = `${base}/schools`;

  const overview = useAsync(() => fetchSchoolOverview(orgId), [orgId]);
  const students = useAsync(() => fetchSchoolStudents(orgId), [orgId]);
  const courses = useAsync<SchoolCourseParticipation[]>(() => fetchSchoolCourseParticipation(orgId), [orgId]);
  const teams = useAsync<Team[]>(async () => (await fetchTeams()).filter((t) => t.orgId === orgId), [orgId]);

  const [tab, setTab] = useState("tournament");
  const [studentAction, setStudentAction] = useState<StudentAction | null>(null);
  const [schoolAction, setSchoolAction] = useState<SchoolAction | null>(null);

  const back = (
    <Link to={listPath} className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-(--color-accent) hover:underline">
      Back to schools
    </Link>
  );

  if (overview.loading && !overview.data) return <LoadingBlock />;
  if (overview.error) return <ErrorBlock onRetry={overview.reload} />;
  if (!overview.data) {
    return (
      <>
        {back}
        <EmptyState title="School not found" body="It may not exist, or you may not have access to it." />
      </>
    );
  }

  const o = overview.data;
  const s = o.school;
  const reloadAll = () => {
    overview.reload();
    students.reload();
    courses.reload();
    teams.reload();
  };

  async function runSchool(status: SchoolAction, reason: string): Promise<string | null> {
    const ok = await setSchoolStatus(orgId, status, reason || undefined);
    if (!ok) return REFUSED;
    showToast(status === "active" ? "School reactivated." : status === "suspended" ? "School suspended." : "School closed.");
    setSchoolAction(null);
    reloadAll();
    return null;
  }

  async function runStudent(a: StudentAction, reason: string): Promise<string | null> {
    let ok: boolean;
    if (a.kind === "solo") ok = await convertToSolo(a.student.studentId);
    else {
      const status: AccountStatus = a.kind === "suspend" ? "suspended" : a.kind === "revoke" ? "revoked" : "active";
      ok = await setAccountStatus(a.student.studentId, status, reason || undefined);
    }
    if (!ok) return REFUSED;
    showToast(`${a.student.fullName}: done.`);
    setStudentAction(null);
    reloadAll();
    return null;
  }

  const studentColumns: Column<SchoolStudent>[] = [
    {
      key: "name",
      header: "Student",
      sortValue: (r) => r.fullName.toLowerCase(),
      render: (r) => (
        <span className="block">
          <span className="font-medium text-(--color-ink)">{r.fullName}</span>
          <span className="block text-xs text-(--color-mist)">{r.email}</span>
        </span>
      ),
    },
    { key: "team", header: "Team", sortValue: (r) => r.teamName ?? "", render: (r) => (r.teamName ? <span>{r.teamName} <StatusBadge status={r.teamStatus ?? ""} /></span> : "-") },
    { key: "courses", header: "Courses", sortValue: (r) => r.coursesEnrolled, render: (r) => r.coursesEnrolled },
    { key: "progress", header: "Progress", sortValue: (r) => r.completionPct, render: (r) => <ProgressBar pct={r.completionPct} label={`${r.lessonsCompleted} of ${r.lessonsTotal} lessons`} /> },
    { key: "active", header: "Last active", sortValue: (r) => r.lastActive ?? "", render: (r) => relativeTime(r.lastActive) },
    { key: "status", header: "Account", sortValue: (r) => r.accountStatus, render: (r) => <StatusBadge status={r.accountStatus} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {r.accountStatus === "active" && (
            <button type="button" className={`${btn.secondary} px-3`} onClick={() => setStudentAction({ student: r, kind: "suspend" })} aria-label={`Suspend ${r.fullName}`}>
              Suspend
            </button>
          )}
          {r.accountStatus !== "revoked" && (
            <button type="button" className={`${btn.secondary} px-3`} onClick={() => setStudentAction({ student: r, kind: "revoke" })} aria-label={`Revoke ${r.fullName}`}>
              Revoke
            </button>
          )}
          {r.accountStatus !== "active" && (
            <button type="button" className={`${btn.secondary} px-3`} onClick={() => setStudentAction({ student: r, kind: "reactivate" })} aria-label={`Reactivate ${r.fullName}`}>
              Reactivate
            </button>
          )}
          <button type="button" className={`${btn.secondary} px-3`} onClick={() => setStudentAction({ student: r, kind: "solo" })} aria-label={`Make ${r.fullName} solo`}>
            Make solo
          </button>
        </div>
      ),
    },
  ];

  const teamColumns: Column<Team>[] = [
    { key: "team", header: "Team", sortValue: (r) => r.name.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.name}</span> },
    { key: "tournament", header: "Tournament", render: (r) => r.tournamentTitle },
    { key: "members", header: "Participants", sortValue: (r) => r.memberCount, render: (r) => r.memberCount },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
  ];

  const courseColumns: Column<SchoolCourseParticipation>[] = [
    { key: "title", header: "Course", sortValue: (r) => r.title.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.title}</span> },
    { key: "students", header: "Students", sortValue: (r) => r.students, render: (r) => r.students },
    { key: "avg", header: "Average completion", sortValue: (r) => r.avgCompletionPct, render: (r) => <ProgressBar pct={r.avgCompletionPct} /> },
  ];

  const solo = studentAction?.kind === "solo";
  const stuLabel = studentAction?.student.fullName ?? "";
  const dialogCopy: Record<StudentAction["kind"], { title: string; body: string; confirm: string }> = {
    suspend: { title: `Suspend ${stuLabel}?`, body: "They cannot sign in until you reactivate them.", confirm: "Suspend" },
    revoke: { title: `Revoke ${stuLabel}?`, body: "Their access is removed. You can reactivate the account later.", confirm: "Revoke" },
    reactivate: { title: `Reactivate ${stuLabel}?`, body: "They can sign in and use the platform again.", confirm: "Reactivate" },
    solo: { title: `Make ${stuLabel} a solo student?`, body: "They leave this school and keep their account and progress as a solo student. This cannot be undone from here.", confirm: "Make solo" },
  };

  return (
    <>
      {back}
      <PageHeader
        title={s.name}
        subtitle={`Registered ${formatDate(s.createdAt)}`}
        actions={
          <>
            <StatusBadge status={s.status} />
            {s.status === "pending" && <SchoolVerifyButtons orgId={orgId} schoolName={s.name} onDone={reloadAll} />}
            {s.status === "active" && (
              <button type="button" className={btn.secondary} onClick={() => setSchoolAction("suspended")}>
                Suspend school
              </button>
            )}
            {(s.status === "suspended" || s.status === "closed") && (
              <button type="button" className={btn.secondary} onClick={() => setSchoolAction("active")}>
                Reactivate school
              </button>
            )}
            {(s.status === "active" || s.status === "suspended") && (
              <button type="button" className={btn.danger} onClick={() => setSchoolAction("closed")}>
                Close school
              </button>
            )}
          </>
        }
      />

      {s.status !== "active" && (
        <div role="status" className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${s.status === "pending" ? "border-(--color-amber-deep)/40 bg-(--color-amber-soft) text-(--color-amber-deep)" : "border-(--color-error)/30 bg-(--color-error-soft) text-(--color-error)"}`}>
          {s.status === "pending" && "This school is pending. It has not been verified yet, so its members cannot use the platform."}
          {s.status === "suspended" && "This school is suspended. Its members cannot use the platform until it is reactivated."}
          {s.status === "closed" && "This school is closed. Memberships have ended and students keep their accounts."}
        </div>
      )}

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Registration number">{s.registrationNo || "-"}</Detail>
          <Detail label="Official email">{s.officialEmail || "-"}</Detail>
          <Detail label="Verified by">{s.verifiedBy ?? "-"}</Detail>
          <Detail label="Verified at">{s.verifiedAt ? formatDateTime(s.verifiedAt) : "-"}</Detail>
        </dl>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Owners" value={o.people.owners} />
        <StatCard label="Teachers" value={o.people.staff} />
        <StatCard label="Students" value={o.people.students} />
        <StatCard label="Pending invites" value={o.people.pendingInvites} />
      </div>

      <div className="mb-4">
        <SlideSwitcher tabs={TABS} value={tab} onChange={setTab} label="School overview" />
      </div>
      <SlidePanel panelKey={tab} index={tab === "tournament" ? 0 : 1}>
        {tab === "tournament" ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Teams" value={o.tournament.teamsTotal} hint={Object.entries(o.tournament.teamsByStatus).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(", ") || undefined} />
              <StatCard label="Participants" value={o.tournament.participants} />
              <StatCard label="Best rank" value={o.tournament.bestRank ?? "-"} />
              <StatCard label="Next tournament" value={<span className="text-lg">{o.tournament.nextTournament?.title ?? "None"}</span>} hint={o.tournament.nextTournament ? formatDate(o.tournament.nextTournament.startsAt) : undefined} />
            </div>
            {teams.loading && !teams.data ? <LoadingBlock /> : teams.error ? <ErrorBlock onRetry={teams.reload} /> : <DataTable columns={teamColumns} rows={teams.data ?? []} rowKey={(r) => r.id} emptyTitle="No teams" emptyBody="This school has not entered any team." />}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Students enrolled" value={o.lms.studentsEnrolled} />
              <StatCard label="Enrollments" value={o.lms.enrollments} />
              <StatCard label="Lessons completed" value={o.lms.lessonsCompleted} />
              <StatCard label="Average completion" value={`${Math.round(o.lms.avgCompletionPct)}%`} />
            </div>
            {courses.loading && !courses.data ? <LoadingBlock /> : courses.error ? <ErrorBlock onRetry={courses.reload} /> : <DataTable columns={courseColumns} rows={courses.data ?? []} rowKey={(r) => r.courseId} emptyTitle="No course activity" emptyBody="No student of this school is enrolled yet." />}
          </div>
        )}
      </SlidePanel>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-(--color-ink)">
        Students <Badge>{students.data?.length ?? 0}</Badge>
      </h2>
      {students.loading && !students.data ? (
        <LoadingBlock />
      ) : students.error ? (
        <ErrorBlock onRetry={students.reload} />
      ) : (
        <DataTable columns={studentColumns} rows={students.data ?? []} rowKey={(r) => r.studentId} emptyTitle="No students" emptyBody="No student has joined this school." />
      )}

      {studentAction && (
        <ConfirmDialog
          key={studentAction.student.studentId + studentAction.kind}
          title={dialogCopy[studentAction.kind].title}
          body={dialogCopy[studentAction.kind].body}
          confirmLabel={dialogCopy[studentAction.kind].confirm}
          danger={studentAction.kind === "revoke" || solo}
          askReason={!solo}
          onConfirm={(reason) => runStudent(studentAction, reason)}
          onCancel={() => setStudentAction(null)}
        />
      )}
      {schoolAction && (
        <ConfirmDialog
          title={schoolAction === "closed" ? `Close ${s.name}?` : schoolAction === "suspended" ? `Suspend ${s.name}?` : `Reactivate ${s.name}?`}
          body={
            schoolAction === "closed"
              ? "Closing ends every membership at this school. Students keep their accounts and can join another school or continue as solo students. Use this only when the school is finished with the platform."
              : schoolAction === "suspended"
                ? "Members of this school cannot use the platform until you reactivate it."
                : "Members of this school can use the platform again."
          }
          confirmLabel={schoolAction === "closed" ? "Close school" : schoolAction === "suspended" ? "Suspend school" : "Reactivate school"}
          danger={schoolAction !== "active"}
          askReason
          onConfirm={(reason) => runSchool(schoolAction, reason)}
          onCancel={() => setSchoolAction(null)}
        />
      )}
    </>
  );
}
