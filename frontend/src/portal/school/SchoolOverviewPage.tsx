import { useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { fetchSchoolCourseParticipation, fetchSchoolOverview } from "../../lib/portalApi";
import { fetchSchoolTeams } from "../../lib/tournamentPortalApi";
import { Link } from "react-router-dom";
import { Card, Eyebrow, DataTable, EmptyState, ErrorBlock, formatDate, LoadingBlock, PageHeader, SlidePanel, SlideSwitcher, StatCard, StatusBadge, useAsync } from "../kit";

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

function daysLeft(iso: string): string {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "1 day" : `${d} days`;
}

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

      <div className="mb-5">
        <SlideSwitcher tabs={TABS} value={tab} onChange={setTab} label="School overview" />
      </div>

      <SlidePanel panelKey={tab} index={index}>
        {tab === "tournament" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Teams" value={t.teamsTotal} />
              <StatCard label="Students taking part" value={t.participants} />
              <StatCard label="Best rank" value={t.bestRank ?? "-"} hint={t.bestRank ? undefined : "No result yet"} />
              <StatCard label="Next tournament" value={next ? daysLeft(next.startsAt) : "-"} hint={next ? next.title : "None scheduled"} />
            </div>

            <Card>
              <Eyebrow>Next tournament</Eyebrow>
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
              <Eyebrow>Teams by status</Eyebrow>
              {statusEntries.length === 0 ? (
                <p className="mt-2 text-sm text-(--color-slate)">No teams yet. <Link to="/school/teams" className="font-semibold text-(--color-accent) underline">Create a team</Link></p>
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
              <h2 className="mb-3 text-base font-semibold text-(--color-ink)">Your teams</h2>
              {teams.loading ? (
                <LoadingBlock />
              ) : teams.error ? (
                <ErrorBlock onRetry={teams.reload} />
              ) : (
                <DataTable
                  rows={teams.data ?? []}
                  rowKey={(r) => r.id}
                  emptyTitle="No teams yet"
                  emptyBody="Open the Teams page and create a team to enter a tournament."
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
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Students enrolled" value={o.lms.studentsEnrolled} />
              <StatCard label="Lessons completed" value={o.lms.lessonsCompleted} />
              <StatCard label="Average completion" value={`${Math.round(o.lms.avgCompletionPct)}%`} />
              <StatCard label="Students in school" value={o.people.students} />
            </div>
            <div>
              <h2 className="mb-3 text-base font-semibold text-(--color-ink)">Courses</h2>
              {courses.loading ? (
                <LoadingBlock />
              ) : courses.error ? (
                <ErrorBlock onRetry={courses.reload} />
              ) : (
                <DataTable
                  rows={courses.data ?? []}
                  rowKey={(r) => r.courseId}
                  emptyTitle="No course activity yet"
                  emptyBody="When your students enrol in courses they will show up here. Invite your first students on the Students page."
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

      <Card className="mt-5">
        <Eyebrow>People</Eyebrow>
        <p className="mt-2 text-sm text-(--color-ink-soft)" aria-label="People">
          {o.people.owners} owner{o.people.owners === 1 ? "" : "s"}, {o.people.staff} teacher{o.people.staff === 1 ? "" : "s"}, {o.people.students} student{o.people.students === 1 ? "" : "s"}, {o.people.pendingInvites} pending invite{o.people.pendingInvites === 1 ? "" : "s"}.{" "}
          <Link to="/school/students" className="font-semibold text-(--color-accent) underline">{o.people.students === 0 ? "Invite your first students" : "Manage students"}</Link>
        </p>
      </Card>
    </>
  );
}
