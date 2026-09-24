import { Link } from "react-router-dom";
import { fetchAuditLog, fetchPendingHanbeeStaff, fetchSchoolDirectory, fetchSiteLmsOverview, fetchSiteTournamentOverview, type AuditEntry } from "../../lib/portalApi";
import { Card, ErrorBlock, LoadingBlock, PageHeader, StatCard, relativeTime, useAsync } from "../kit";

const ACTIONS: Record<string, string> = {
  verify_school: "verified a school",
  reject_school: "rejected a school",
  set_account_status: "changed an account status",
  set_school_status: "changed a school status",
  convert_to_solo: "moved a student to solo",
  join_school: "joined a school",
  invite_students: "invited students",
  create_tournament: "created a tournament",
  decide_team: "decided on a team",
  enroll_student: "enrolled a student",
};

function sentence(e: AuditEntry): string {
  const who = e.actorName ?? "Someone";
  const what = ACTIONS[e.action] ?? e.action.replace(/_/g, " ");
  return `${who} ${what}`;
}

export function MonitorPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [lms, tour, schools, staff, audit] = await Promise.all([
      fetchSiteLmsOverview(),
      fetchSiteTournamentOverview(),
      fetchSchoolDirectory(),
      fetchPendingHanbeeStaff(),
      fetchAuditLog(20),
    ]);
    return { lms, tour, pendingSchools: schools.filter((s) => s.status === "pending").length, pendingStaff: staff.length, audit };
  });

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock onRetry={reload} />;
  const { lms, tour, pendingSchools, pendingStaff, audit } = data;
  const s = lms?.schools ?? {};

  return (
    <>
      <PageHeader
        title="Monitor"
        subtitle="Everything at a glance."
        actions={
          <>
            <Link to="/manager/schools" className="inline-flex min-h-11 items-center rounded-xl border border-(--color-line) px-4 text-sm font-medium">Schools</Link>
            <Link to="/manager/staff" className="inline-flex min-h-11 items-center rounded-xl border border-(--color-line) px-4 text-sm font-medium">Hanbee staff</Link>
          </>
        }
      />

      <section aria-label="Needs your attention" className="mb-6">
        <h2 className="mb-2 font-display text-lg font-semibold text-(--color-ink)">Needs your attention</h2>
        <Link to="/manager/verifications" className="block">
          <Card className="flex flex-wrap items-center justify-between gap-3 hover:bg-(--color-cloud)">
            <span className="text-sm text-(--color-ink)">
              <strong>{pendingSchools}</strong> {pendingSchools === 1 ? "school" : "schools"} waiting for verification, <strong>{pendingStaff}</strong> Hanbee staff{" "}
              {pendingStaff === 1 ? "application" : "applications"} pending
            </span>
            <span className="text-sm font-semibold text-(--color-ink)">Open verifications</span>
          </Card>
        </Link>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active schools" value={s.active ?? 0} />
        <StatCard label="Pending schools" value={s.pending ?? 0} tone={(s.pending ?? 0) > 0 ? "warn" : "neutral"} />
        <StatCard label="Suspended or closed" value={(s.suspended ?? 0) + (s.closed ?? 0)} />
        <StatCard label="Students" value={lms?.students ?? 0} hint={`${lms?.soloStudents ?? 0} solo`} />
        <StatCard label="Teams awaiting decision" value={tour?.teamsAwaitingDecision ?? 0} tone={(tour?.teamsAwaitingDecision ?? 0) > 0 ? "warn" : "neutral"} />
        <StatCard label="Course applications pending" value={lms?.courseApplicationsPending ?? 0} />
        <StatCard label="Tournament participants" value={tour?.participants ?? 0} />
        <StatCard label="Enrollments" value={lms?.enrollments ?? 0} hint={`${lms?.avgCompletionPct ?? 0}% average completion`} />
      </div>

      <h2 className="mb-2 font-display text-lg font-semibold text-(--color-ink)">Recent activity</h2>
      <Card padded={false}>
        {audit.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No activity yet.</p>
        ) : (
          <ul aria-label="Recent activity" className="divide-y divide-(--color-line)">
            {audit.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
                <span className="text-(--color-ink)">{sentence(e)}</span>
                <span className="text-xs text-(--color-mist)">{relativeTime(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
