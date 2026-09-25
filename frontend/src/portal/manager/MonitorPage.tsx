import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchAuditLog,
  fetchHanbeeStaffOverview,
  fetchPendingHanbeeStaff,
  fetchSchoolDirectory,
  fetchSiteLmsOverview,
  fetchSiteTournamentOverview,
  type AuditEntry,
  type SchoolDirectoryRow,
} from "../../lib/portalApi";
import { Badge, Card, DataTable, ErrorBlock, LoadingBlock, PageHeader, StatCard, relativeTime, useAsync } from "../kit";
import { primaryButton } from "./ConfirmDialog";

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
  invite_school_staff: "invited school staff",
  invite_staff: "invited school staff",
};

function sentence(e: AuditEntry): string {
  const who = e.actorName ?? "Someone";
  const what = ACTIONS[e.action] ?? e.action.replace(/_/g, " ");
  return `${who} ${what}`;
}

const ROLE_WORDS: Record<string, string> = {
  hanbee_staff: "Hanbee staff",
  staff: "Hanbee staff",
  school_owner: "School owner",
  school_staff: "School staff",
  teacher: "School staff",
  manager: "Manager",
};

interface SignIn {
  key: string;
  name: string;
  role: string;
  at: string;
  active: boolean;
}

/** Last 10 sign-ins of Hanbee staff and school staff. Never students. */
async function fetchRecentSignIns(): Promise<SignIn[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("auto_attendance_sessions")
    .select("user_id, login_at, last_heartbeat_at, status, ended_at, profiles(full_name, role)")
    .order("login_at", { ascending: false })
    .limit(200);
  if (error || !data) return null;
  const out: SignIn[] = [];
  const seen = new Set<string>();
  for (const raw of data as unknown as Array<{ user_id: string; login_at: string; last_heartbeat_at: string; status: string; ended_at: string | null; profiles: { full_name: string | null; role: string | null } | { full_name: string | null; role: string | null }[] | null }>) {
    const p = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
    if (!p || !p.role || p.role === "student" || p.role === "manager") continue;
    // One row per person (their latest sign-in), so repeated logins do not flood the card.
    if (seen.has(raw.user_id)) continue;
    seen.add(raw.user_id);
    out.push({
      key: `${raw.user_id}-${raw.login_at}`,
      name: p.full_name ?? "Unknown",
      role: ROLE_WORDS[p.role] ?? p.role.replace(/_/g, " "),
      at: raw.login_at,
      // "Active" only while the session is still sending heartbeats (same 90 second rule the app uses).
      active: !raw.ended_at && raw.status === "active" && Date.now() - new Date(raw.last_heartbeat_at).getTime() < 90_000,
    });
    if (out.length === 10) break;
  }
  return out;
}

export function MonitorPage() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useAsync(async () => {
    const [lms, tour, schools, pendingStaff, staff, audit, signIns] = await Promise.all([
      fetchSiteLmsOverview(),
      fetchSiteTournamentOverview(),
      fetchSchoolDirectory(),
      fetchPendingHanbeeStaff(),
      fetchHanbeeStaffOverview(),
      fetchAuditLog(10),
      fetchRecentSignIns(),
    ]);
    return { lms, tour, schools, pendingStaff: pendingStaff.length, staffCount: staff.length, audit, signIns };
  });

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock onRetry={reload} />;
  const { lms, tour, schools, pendingStaff, staffCount, audit, signIns } = data;
  const s = lms?.schools ?? {};
  const pendingSchools = schools.filter((x) => x.status === "pending").length;
  const clear = pendingSchools === 0 && pendingStaff === 0;
  const first = (profile?.fullName ?? "").split(" ")[0];
  const participation = schools.filter((x) => x.status === "active" || x.teams > 0 || x.participants > 0);

  return (
    <>
      <PageHeader title={first ? `Hello, ${first}` : "Monitor"} subtitle="Everything on the platform at a glance." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Schools active" value={s.active ?? 0} />
        <StatCard label="Schools waiting" value={pendingSchools} tone={pendingSchools > 0 ? "warn" : "neutral"} />
        <StatCard label="Hanbee staff" value={staffCount} />
        <StatCard label="Active students" value={lms?.students ?? 0} hint={`${lms?.soloStudents ?? 0} solo`} />
        <StatCard label="Teams awaiting" value={tour?.teamsAwaitingDecision ?? 0} tone={(tour?.teamsAwaitingDecision ?? 0) > 0 ? "warn" : "neutral"} hint="Waiting for a decision" />
        <StatCard label="Tournament participants" value={tour?.participants ?? 0} />
      </div>

      <section aria-label="Needs your attention" className="mb-5">
        <Card className={clear ? "" : "border-(--color-accent)/40"}>
          <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Needs your attention</h2>
          {clear ? (
            <p className="mt-2 text-sm text-(--color-ink-soft)">All clear. No schools or staff applications are waiting for you.</p>
          ) : (
            <ul className="mt-3 divide-y divide-(--color-line)">
              {pendingSchools > 0 && (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="text-sm text-(--color-ink)">
                    <strong>{pendingSchools}</strong> {pendingSchools === 1 ? "school" : "schools"} waiting for verification
                  </span>
                  <Link to="/manager/verifications" className={primaryButton}>Review schools</Link>
                </li>
              )}
              {pendingStaff > 0 && (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="text-sm text-(--color-ink)">
                    <strong>{pendingStaff}</strong> Hanbee staff {pendingStaff === 1 ? "application" : "applications"} pending
                  </span>
                  <Link to="/manager/verifications" className={primaryButton}>Review applications</Link>
                </li>
              )}
            </ul>
          )}
        </Card>
      </section>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card padded={false}>
          <div className="px-5 pt-5 sm:px-6"><h2 className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Recent activity</h2></div>
          {audit.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No activity yet.</p>
          ) : (
            <ul aria-label="Recent activity" className="mt-2 divide-y divide-(--color-line)">
              {audit.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm sm:px-6">
                  <span className="text-(--color-ink)">{sentence(e)}</span>
                  <span className="text-xs text-(--color-mist)">{relativeTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5 sm:px-6"><h2 className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Recent sign-ins</h2></div>
          {signIns === null ? (
            <p className="px-5 py-8 text-center text-sm text-(--color-slate)">Sign-ins could not be loaded right now.</p>
          ) : signIns.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No staff sign-ins yet.</p>
          ) : (
            <ul aria-label="Recent sign-ins" className="mt-2 divide-y divide-(--color-line)">
              {signIns.map((r) => (
                <li key={r.key} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm sm:px-6">
                  <span className="min-w-0">
                    <span className="font-medium text-(--color-ink)">{r.name}</span>
                    <span className="ml-2 text-xs text-(--color-slate)">{r.role}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-(--color-mist)">{relativeTime(r.at)}</span>
                    <Badge tone={r.active ? "good" : "neutral"}>{r.active ? "Active" : "Ended"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold text-(--color-ink)">Tournament participation by school</h2>
      <DataTable<SchoolDirectoryRow>
        rows={participation}
        rowKey={(r) => r.orgId}
        emptyTitle="No schools yet"
        emptyBody="Schools taking part in tournaments will appear here."
        columns={[
          { key: "school", header: "School", sortValue: (r) => r.name.toLowerCase(), render: (r) => <Link to={`/manager/schools/${r.orgId}`} className="font-medium text-(--color-ink) hover:underline">{r.name}</Link> },
          { key: "teams", header: "Teams", sortValue: (r) => r.teams, render: (r) => r.teams },
          { key: "participants", header: "Participants", sortValue: (r) => r.participants, render: (r) => r.participants },
        ]}
      />
    </>
  );
}
