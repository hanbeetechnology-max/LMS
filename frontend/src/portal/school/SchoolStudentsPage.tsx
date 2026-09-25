import { useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { useToast } from "../../lib/ToastProvider";
import { fetchSchoolInvitations, fetchSchoolStudents, inviteStudents, type SchoolStudent } from "../../lib/portalApi";
import { Avatar, Card, DataTable, EmptyState, ErrorBlock, formatDate, LoadingBlock, PageHeader, relativeTime, StatusBadge, useAsync } from "../kit";
import { InvitationsCard } from "./InvitationsCard";
import { InviteStudentsCard } from "./InviteStudentsCard";
import { MailStep } from "./MailStep";
import { ProgressBar } from "./ProgressBar";
import { TeachersCard } from "./TeachersCard";

export function SchoolStudentsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const orgId = profile?.school?.orgId ?? "";
  const isOwner = profile?.school?.memberRole === "owner";
  const schoolName = profile?.school?.name ?? "your school";

  const students = useAsync(() => fetchSchoolStudents(orgId), [orgId]);
  const invitations = useAsync(() => fetchSchoolInvitations(orgId), [orgId]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SchoolStudent | null>(null);
  const [mailEmails, setMailEmails] = useState<string[]>([]);
  const mailRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = students.data ?? [];
    return q ? rows.filter((s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : rows;
  }, [students.data, search]);

  function openMailStep(emails: string[]) {
    setMailEmails(emails);
    invitations.reload();
    setTimeout(() => mailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function resend(email: string) {
    const out = await inviteStudents(orgId, [email]).catch(() => []);
    const ok = out.find((r) => r.result === "invited" || r.result === "already_invited");
    if (ok) {
      showToast("Invitation refreshed. Send it from your own email below.");
      openMailStep([ok.email]);
    } else showToast("This invitation could not be refreshed. The student may already have joined another school.", "error");
  }

  if (!orgId) return <EmptyState title="No school found" body="Your account is not linked to a school." />;

  return (
    <>
      <PageHeader title="Students" subtitle="Everyone in your school, and how to invite more." />

      <section aria-label="Student list" className="mb-8">
        <div className="mb-3 max-w-sm">
          <label htmlFor="student-search" className="block text-sm font-medium text-(--color-ink)">Search students</label>
          <input
            id="student-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
            className="mt-1 min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-violet)"
          />
        </div>
        {students.loading ? (
          <LoadingBlock />
        ) : students.error ? (
          <ErrorBlock onRetry={students.reload} />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(s) => s.studentId}
            onRowClick={setSelected}
            emptyTitle={search ? "No students match your search" : "No students yet"}
            emptyBody={search ? "Try a different name or email." : "Invite students below and they will appear here once they join."}
            columns={[
              {
                key: "name",
                header: "Name",
                sortValue: (s) => s.fullName.toLowerCase(),
                render: (s) => (
                  <span className="flex items-center gap-2">
                    <Avatar name={s.fullName} size={32} />
                    <span className="font-medium text-(--color-ink)">{s.fullName}</span>
                  </span>
                ),
              },
              { key: "email", header: "Email", sortValue: (s) => s.email, render: (s) => <span className="break-all">{s.email}</span> },
              { key: "joined", header: "Joined", sortValue: (s) => s.joinedAt, render: (s) => formatDate(s.joinedAt) },
              {
                key: "team",
                header: "Team",
                sortValue: (s) => s.teamName ?? "",
                render: (s) =>
                  s.teamName ? (
                    <span className="flex flex-wrap items-center gap-2">
                      {s.teamName}
                      {s.teamStatus && <StatusBadge status={s.teamStatus} />}
                    </span>
                  ) : (
                    <span className="text-(--color-mist)">No team</span>
                  ),
              },
              { key: "courses", header: "Courses", sortValue: (s) => s.coursesEnrolled, render: (s) => s.coursesEnrolled },
              { key: "progress", header: "Progress", sortValue: (s) => s.completionPct, render: (s) => <ProgressBar pct={s.completionPct} /> },
              { key: "last", header: "Last active", sortValue: (s) => s.lastActive ?? "", render: (s) => relativeTime(s.lastActive) },
              { key: "status", header: "Account", sortValue: (s) => s.accountStatus, render: (s) => <StatusBadge status={s.accountStatus} /> },
            ]}
          />
        )}
        {selected && (
          <Card className="mt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-(--color-ink)">{selected.fullName}</h2>
                <p className="break-all text-sm text-(--color-slate)">{selected.email}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-full border border-(--color-line) px-4 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud)">
                Close
              </button>
            </div>
            <p className="mt-3 text-sm text-(--color-ink-soft)">
              {selected.lessonsCompleted} of {selected.lessonsTotal} lessons completed across {selected.coursesEnrolled} course{selected.coursesEnrolled === 1 ? "" : "s"}. Joined {formatDate(selected.joinedAt)}.
            </p>
          </Card>
        )}
      </section>

      <div className="space-y-6">
        <InviteStudentsCard orgId={orgId} onInvited={openMailStep} />
        {mailEmails.length > 0 && (
          <div ref={mailRef}>
            <MailStep orgId={orgId} schoolName={schoolName} emails={mailEmails} />
          </div>
        )}
        <InvitationsCard invitations={invitations.data ?? []} loading={invitations.loading} error={invitations.error} reload={invitations.reload} onResend={resend} />
        {isOwner && <TeachersCard orgId={orgId} schoolName={schoolName} invitations={invitations.data ?? []} reload={invitations.reload} />}
      </div>
    </>
  );
}
