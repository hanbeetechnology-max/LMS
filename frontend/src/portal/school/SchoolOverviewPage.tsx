import { useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { fetchSchoolCourseParticipation, fetchSchoolOverview } from "../../lib/portalApi";
import { fetchSchoolTeams } from "../../lib/tournamentPortalApi";
import { Card, DataTable, EmptyState, ErrorBlock, formatDate, LoadingBlock, PageHeader, SlidePanel, SlideSwitcher, StatCard, StatusBadge, useAsync } from "../kit";

const TABS = [
  { id: "tournament", label: "Tournament" },
  { id: "learning", label: "Learning" },
];

const STATUS_WORDS: Record<string, string> = {
  draft: "Draft",
  applied: "Applied",
  payment_declared: "Payment declared",
  verified: "Verified",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function SchoolOverviewPage() {
  const { profile } = useAuth();
  const orgId = profile?.school?.orgId ?? "";
  const [tab, setTab] = useState("tournament");

  const overview = useAsync(() => fetchSchoolOverview(orgId), [orgId]);
  const teams = useAsync(() => fetchSchoolTeams(), [orgId]);
  const courses = useAsync(() => fetchSchoolCourseParticipation(orgId), [orgId]);

  if (!orgId) return <EmptyState title="No school found" body="Your account is not linked to a school." />;
  if (overview.loading) return <LoadingBlock />;
  if (overview.error) return <ErrorBlock onRetry={overview.reload} />;
  const o = overview.data;
  if (!o) return <EmptyState title="Overview unavailable" body="We could not load your school. Try again in a moment." />;

  const t = o.tournament;
  const next = t.nextTournament;
  const statusEntries = Object.entries(t.teamsByStatus ?? {});
  const index = tab === "tournament" ? 0 : 1;

  return (
    <>
      <PageHeader
        title={o.school.name}
        subtitle="Your school at a glance."
        actions={<StatusBadge status={o.school.status} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="People">
        <StatCard label="Owners" value={o.people.owners} />
        <StatCard label="Teachers" value={o.people.staff} />
        <StatCard label="Students" value={o.people.students} />
        <StatCard label="Pending invites" value={o.people.pendingInvites} tone={o.people.pendingInvites > 0 ? "warn" : "neutral"} />
      </div>

      <div className="mb-5">
        <SlideSwitcher tabs={TABS} value={tab} onChange={setTab} label="School overview" />
      </div>

      <SlidePanel panelKey={tab} index={index}>
        {tab === "tournament" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Teams" value={t.teamsTotal} />
              <StatCard label="Students taking part" value={t.participants} />
              <StatCard label="Best rank" value={t.bestRank ?? "-"} hint={t.bestRank ? undefined : "No result yet"} />
            </div>

            <Card>
              <h2 className="font-display text-lg font-semibold text-(--color-ink)">Next tournament</h2>
              {next ? (
                <div className="mt-2 text-sm text-(--color-ink-soft)">
                  <p className="text-base font-semibold text-(--color-ink)">{next.title}</p>
                  <p>{formatDate(next.startsAt)} at {next.venue || "venue to be announced"}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-(--color-slate)">No upcoming tournament is scheduled yet.</p>
              )}
            </Card>

            <Card>
              <h2 className="font-display text-lg font-semibold text-(--color-ink)">Teams by status</h2>
              {statusEntries.length === 0 ? (
                <p className="mt-2 text-sm text-(--color-slate)">No teams yet.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-3">
                  {statusEntries.map(([status, count]) => (
                    <li key={status} className="flex items-center gap-2 text-sm text-(--color-ink-soft)">
                      <StatusBadge status={status} /> <span>{STATUS_WORDS[status] ?? status}: {count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div>
              <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Your teams</h2>
              {teams.loading ? (
                <LoadingBlock />
              ) : teams.error ? (
                <ErrorBlock onRetry={teams.reload} />
              ) : (
                <DataTable
                  rows={teams.data ?? []}
                  rowKey={(r) => r.id}
                  emptyTitle="No teams yet"
                  emptyBody="Create a team on the Teams page to enter a tournament."
                  columns={[
                    { key: "name", header: "Team", sortValue: (r) => r.name, render: (r) => <span className="font-medium text-(--color-ink)">{r.name}</span> },
                    { key: "tournament", header: "Tournament", sortValue: (r) => r.tournamentTitle, render: (r) => r.tournamentTitle },
                    { key: "members", header: "Members", sortValue: (r) => r.memberCount, render: (r) => r.memberCount },
                    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
                  ]}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Students enrolled" value={o.lms.studentsEnrolled} />
              <StatCard label="Lessons completed" value={o.lms.lessonsCompleted} />
              <StatCard label="Average completion" value={`${Math.round(o.lms.avgCompletionPct)}%`} />
            </div>
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Courses</h2>
              {courses.loading ? (
                <LoadingBlock />
              ) : courses.error ? (
                <ErrorBlock onRetry={courses.reload} />
              ) : (
                <DataTable
                  rows={courses.data ?? []}
                  rowKey={(r) => r.courseId}
                  emptyTitle="No course activity yet"
                  emptyBody="When your students enrol in courses they will show up here."
                  columns={[
                    { key: "title", header: "Course", sortValue: (r) => r.title, render: (r) => <span className="font-medium text-(--color-ink)">{r.title}</span> },
                    { key: "students", header: "Students", sortValue: (r) => r.students, render: (r) => r.students },
                    { key: "avg", header: "Average completion", sortValue: (r) => r.avgCompletionPct, render: (r) => `${Math.round(r.avgCompletionPct)}%` },
                  ]}
                />
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </>
  );
}
