import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { useToast } from "../../lib/ToastProvider";
import { ScanToPayCard } from "../../components/ui/ScanToPayCard";
import {
  addTeamMember,
  applyTeam,
  createTeam,
  fetchAddableStudents,
  fetchSchoolTeams,
  fetchTeamMembers,
  fetchTournaments,
  removeTeamMember,
  withdrawTeam,
  type AddableStudent,
  type Team,
} from "../../lib/tournamentPortalApi";
import { Card, EmptyState, ErrorBlock, formatDate, LoadingBlock, PageHeader, StatusBadge, useAsync } from "../kit";

const STATUS_HELP: Record<string, string> = {
  draft: "Draft: you can still add or remove students. Apply when the team is ready.",
  applied: "Applied: waiting for HANBEE to check your team.",
  payment_declared: "Payment declared: you said the fee was paid. HANBEE will verify it, then confirm your team.",
  verified: "Verified: HANBEE confirmed your team. You are in.",
  rejected: "Rejected: HANBEE did not accept this team. Contact HANBEE if you have questions.",
  withdrawn: "Withdrawn: this team is no longer taking part.",
};

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-line) px-4 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud) disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)";
const primary =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-accent) px-5 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)";

export function SchoolTeamsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const orgId = profile?.school?.orgId ?? "";
  const tournaments = useAsync(() => fetchTournaments(), [orgId]);
  const [tournamentId, setTournamentId] = useState("");

  useEffect(() => {
    if (!tournamentId && tournaments.data && tournaments.data.length > 0) setTournamentId(tournaments.data[0].id);
  }, [tournaments.data, tournamentId]);

  const teams = useAsync(() => (tournamentId ? fetchSchoolTeams(tournamentId) : Promise.resolve([] as Team[])), [tournamentId]);
  const addable = useAsync(() => (tournamentId ? fetchAddableStudents(tournamentId) : Promise.resolve([] as AddableStudent[])), [tournamentId]);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !tournamentId) return;
    setCreating(true);
    setCreateMsg(null);
    const id = await createTeam(tournamentId, trimmed);
    setCreating(false);
    if (!id) {
      setCreateMsg("The team could not be created. The name may already be used, or your school may not be able to enter this tournament.");
      return;
    }
    showToast("Team created");
    setName("");
    teams.reload();
  }

  if (!orgId) return <EmptyState title="No school found" body="Your account is not linked to a school." />;

  const tournament = tournaments.data?.find((t) => t.id === tournamentId);

  return (
    <>
      <PageHeader title="Teams" subtitle="Build your school's teams and enter them in a tournament." />

      {tournaments.loading ? (
        <LoadingBlock />
      ) : tournaments.error ? (
        <ErrorBlock onRetry={tournaments.reload} />
      ) : (tournaments.data?.length ?? 0) === 0 ? (
        <EmptyState title="No tournaments yet" body="When HANBEE opens a tournament it will be listed here." />
      ) : (
        <div className="space-y-6">
          <div className="max-w-md">
            <label htmlFor="tournament-picker" className="block text-sm font-medium text-(--color-ink)">Tournament</label>
            <select
              id="tournament-picker"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-accent)"
            >
              {tournaments.data!.map((t) => (
                <option key={t.id} value={t.id}>{t.title} ({formatDate(t.startsAt)})</option>
              ))}
            </select>
            {tournament && <p className="mt-1 text-xs text-(--color-slate)">{tournament.venue ? `${tournament.venue}. ` : ""}Status: {tournament.status}</p>}
          </div>

          <Card>
            <h2 className="text-lg font-semibold text-(--color-ink)">Create a team</h2>
            <form onSubmit={create} className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <label htmlFor="team-name" className="block text-sm font-medium text-(--color-ink)">Team name</label>
                <input
                  id="team-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className="mt-1 min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-accent)"
                />
              </div>
              <button type="submit" disabled={creating || !name.trim()} className={primary}>{creating ? "Creating..." : "Create team"}</button>
            </form>
            {createMsg && <p role="alert" className="mt-2 text-sm text-(--color-error)">{createMsg}</p>}
          </Card>

          {teams.loading ? (
            <LoadingBlock />
          ) : teams.error ? (
            <ErrorBlock onRetry={teams.reload} />
          ) : (teams.data?.length ?? 0) === 0 ? (
            <EmptyState title="No teams for this tournament" body="Create a team above, then add students and apply." />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {teams.data!.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  tournamentId={tournamentId}
                  addable={addable.data ?? []}
                  onChanged={() => {
                    teams.reload();
                    addable.reload();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function TeamCard({ team, addable, onChanged }: { team: Team; tournamentId: string; addable: AddableStudent[]; onChanged: () => void }) {
  const { showToast } = useToast();
  const members = useAsync(() => fetchTeamMembers(team.id), [team.id, team.memberCount, team.status]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const isDraft = team.status === "draft";
  const count = members.data?.length ?? team.memberCount;
  const canWithdraw = team.status !== "withdrawn" && team.status !== "rejected";

  async function run(action: () => Promise<boolean>, ok: string, fail: string) {
    setBusy(true);
    setMsg(null);
    const done = await action();
    setBusy(false);
    if (done) {
      showToast(ok);
      members.reload();
      onChanged();
    } else setMsg(fail);
    return done;
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-(--color-ink)">{team.name}</h3>
        <StatusBadge status={team.status} />
      </div>
      <p className="mt-1 text-sm text-(--color-slate)">{STATUS_HELP[team.status] ?? team.status}</p>

      <h4 className="mt-4 text-sm font-semibold text-(--color-ink)">Members ({count})</h4>
      {members.loading ? (
        <LoadingBlock />
      ) : members.error ? (
        <ErrorBlock onRetry={members.reload} />
      ) : (members.data?.length ?? 0) === 0 ? (
        <p className="mt-1 text-sm text-(--color-slate)">No members yet. A team needs at least one member to apply.</p>
      ) : (
        <ul className="mt-1 divide-y divide-(--color-line)">
          {members.data!.map((m) => (
            <li key={m.studentId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className="text-(--color-ink)">{m.fullName}</span>
              {isDraft && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => removeTeamMember(team.id, m.studentId), `${m.fullName} removed`, "Could not remove this student.")}
                  className={btn}
                  aria-label={`Remove ${m.fullName} from ${team.name}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isDraft && (
        <div className="mt-4">
          <label htmlFor={`add-${team.id}`} className="block text-sm font-medium text-(--color-ink)">Add a student</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <select
              id={`add-${team.id}`}
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="min-h-11 min-w-0 flex-1 basis-48 rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink)"
            >
              <option value="">{addable.length === 0 ? "No students available" : "Choose a student"}</option>
              {addable.map((s) => (
                <option key={s.studentId} value={s.studentId}>{s.fullName}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !pick}
              onClick={async () => {
                const done = await run(
                  () => addTeamMember(team.id, pick),
                  "Student added",
                  "This student could not be added. They may already be in another team for this tournament.",
                );
                if (done) setPick("");
              }}
              className={btn}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {msg && <p role="alert" className="mt-3 text-sm text-(--color-error)">{msg}</p>}

      {isDraft && (
        <div className="mt-4">
          {!applying ? (
            <button type="button" className={primary} disabled={count < 1} onClick={() => setApplying(true)}>
              Apply to the tournament
            </button>
          ) : (
            <div className="space-y-3">
              <ScanToPayCard amountLabel="tournament fee" confirmed={declared} onConfirmedChange={setDeclared} />
              <p className="text-xs text-(--color-slate)">Payment is optional to apply. HANBEE checks it afterwards.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={primary}
                  onClick={async () => {
                    const done = await run(() => applyTeam(team.id, declared), "Application sent", "The application was refused. Check that the team has at least one member and the tournament is open.");
                    if (done) setApplying(false);
                  }}
                >
                  {declared ? "Apply with payment declared" : "Apply without payment"}
                </button>
                <button type="button" className={btn} onClick={() => setApplying(false)}>Cancel</button>
              </div>
            </div>
          )}
          {count < 1 && <p className="mt-2 text-xs text-(--color-slate)">Add at least one member to apply.</p>}
        </div>
      )}

      {canWithdraw && (
        <div className="mt-4 border-t border-(--color-line) pt-3">
          {confirmWithdraw ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-(--color-ink-soft)">Withdraw {team.name}? This cannot be undone.</span>
              <button
                type="button"
                disabled={busy}
                className={`${btn} border-(--color-error) text-(--color-error)`}
                onClick={async () => {
                  await run(() => withdrawTeam(team.id), "Team withdrawn", "The team could not be withdrawn.");
                  setConfirmWithdraw(false);
                }}
              >
                Confirm withdraw
              </button>
              <button type="button" className={btn} onClick={() => setConfirmWithdraw(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className={btn} onClick={() => setConfirmWithdraw(true)}>Withdraw team</button>
          )}
        </div>
      )}
    </Card>
  );
}
