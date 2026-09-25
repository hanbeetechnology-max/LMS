import { useEffect, useState, type FormEvent } from "react";
import {
  createTournament,
  decideTeam,
  deleteResult,
  fetchLeaderboard,
  fetchTeamMembers,
  fetchTeams,
  fetchTournaments,
  setResult,
  updateTournament,
  type Decision,
  type LeaderboardRow,
  type Team,
  type TeamMember,
  type Tournament,
  type TournamentStatus,
} from "../../lib/tournamentPortalApi";
import { fetchSiteTournamentOverview } from "../../lib/portalApi";
import { useToast } from "../../lib/ToastProvider";
import { Badge, Card, DataTable, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatCard, StatusBadge, formatDate, formatDateTime, useAsync, type Column } from "../kit";
import { btn, ConfirmDialog, countOf, Field, inputClass, REFUSED } from "./ui";

interface FormState {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  status: TournamentStatus;
}

const EMPTY_FORM: FormState = { title: "", description: "", startsAt: "", endsAt: "", venue: "", status: "upcoming" };

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TournamentForm({ editing, onSaved, onCancel }: { editing: Tournament | null; onSaved: (id: string | null) => void; onCancel: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(
    editing ? { title: editing.title, description: editing.description, startsAt: toLocalInput(editing.startsAt), endsAt: toLocalInput(editing.endsAt), venue: editing.venue, status: editing.status } : EMPTY_FORM,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim() || !form.startsAt || !form.endsAt) {
      setError("Add a title, a start and an end.");
      return;
    }
    if (new Date(form.endsAt) < new Date(form.startsAt)) {
      setError("The end must be after the start.");
      return;
    }
    setBusy(true);
    const input = { title: form.title.trim(), description: form.description.trim(), startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), venue: form.venue.trim() };
    let id: string | null = editing?.id ?? null;
    let ok: boolean;
    if (editing) ok = await updateTournament(editing.id, input, form.status);
    else {
      id = await createTournament(input);
      ok = !!id;
      if (ok && form.status !== "upcoming" && id) ok = await updateTournament(id, input, form.status);
    }
    setBusy(false);
    if (!ok) {
      setError(REFUSED);
      return;
    }
    showToast(editing ? "Tournament updated." : "Tournament created.");
    onSaved(id);
  }

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold text-(--color-ink)">{editing ? "Edit tournament" : "New tournament"}</h3>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Title">{(id) => <input id={id} value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />}</Field>
        <Field label="Venue">{(id) => <input id={id} value={form.venue} onChange={(e) => set("venue", e.target.value)} className={inputClass} />}</Field>
        <Field label="Starts">{(id) => <input id={id} type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inputClass} />}</Field>
        <Field label="Ends">{(id) => <input id={id} type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={inputClass} />}</Field>
        <Field label="Status">
          {(id) => (
            <select id={id} value={form.status} onChange={(e) => set("status", e.target.value as TournamentStatus)} className={inputClass}>
              <option value="upcoming">upcoming</option>
              <option value="live">live</option>
              <option value="completed">completed</option>
            </select>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">{(id) => <textarea id={id} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} py-2`} />}</Field>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-(--color-error-soft) px-3 py-2 text-sm text-(--color-error) sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className={btn.primary}>
            {busy ? "Saving..." : editing ? "Save changes" : "Create tournament"}
          </button>
          <button type="button" onClick={onCancel} className={btn.secondary}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function ResultsSection({ tournament, teams }: { tournament: Tournament; teams: Team[] }) {
  const { showToast } = useToast();
  const board = useAsync<LeaderboardRow[]>(() => fetchLeaderboard(tournament.id), [tournament.id]);
  const verified = teams.filter((t) => t.status === "verified");
  const [teamId, setTeamId] = useState("");
  const [rank, setRank] = useState("1");
  const [points, setPoints] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<LeaderboardRow | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const r = Number(rank);
    const p = Number(points);
    if (!teamId) return setError("Choose a verified team.");
    if (!Number.isInteger(r) || r < 1) return setError("Rank must be a whole number, 1 or higher.");
    if (!Number.isFinite(p)) return setError("Points must be a number.");
    setBusy(true);
    const ok = await setResult(tournament.id, teamId, r, p, notes.trim());
    setBusy(false);
    if (!ok) return setError("The database refused this result. Only verified teams of this tournament can have a result, and the rank must be free to use.");
    showToast("Result saved.");
    setNotes("");
    board.reload();
  }

  return (
    <section aria-label="Results and leaderboard" className="mt-8">
      <h3 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Results and leaderboard</h3>
      {board.loading && !board.data ? (
        <LoadingBlock />
      ) : board.error ? (
        <ErrorBlock onRetry={board.reload} />
      ) : (
        <DataTable
          columns={[
            { key: "rank", header: "Rank", sortValue: (r) => r.rank, render: (r) => <span className="font-display font-semibold text-(--color-ink)">{r.rank}</span> },
            { key: "team", header: "Team", render: (r) => r.teamName },
            { key: "school", header: "School", render: (r) => r.schoolName ?? "Solo" },
            { key: "points", header: "Points", sortValue: (r) => r.points, render: (r) => r.points },
            { key: "notes", header: "Notes", render: (r) => r.notes || "-" },
            {
              key: "x",
              header: "Action",
              render: (r) => (
                <button type="button" className={`${btn.secondary} px-3`} onClick={() => setRemoving(r)} aria-label={`Delete result for ${r.teamName}`}>
                  Delete
                </button>
              ),
            },
          ]}
          rows={board.data ?? []}
          rowKey={(r) => r.teamId}
          emptyTitle="No results yet"
          emptyBody="Results can be added for verified teams."
        />
      )}
      <Card className="mt-4">
        <h4 className="font-semibold text-(--color-ink)">Set a result</h4>
        <p className="mt-1 text-sm text-(--color-slate)">Only verified teams can have a result. The database refuses anything else.</p>
        <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="Team">
            {(id) => (
              <select id={id} value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputClass}>
                <option value="">Choose a team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.status !== "verified" ? ` (${t.status.replace(/_/g, " ")})` : ""}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Rank">{(id) => <input id={id} type="number" min={1} value={rank} onChange={(e) => setRank(e.target.value)} className={inputClass} />}</Field>
          <Field label="Points">{(id) => <input id={id} type="number" value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass} />}</Field>
          <Field label="Notes">{(id) => <input id={id} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />}</Field>
          {verified.length === 0 && <p className="text-sm text-(--color-slate) sm:col-span-4">No team is verified for this tournament yet.</p>}
          {error && (
            <p role="alert" className="rounded-xl bg-(--color-error-soft) px-3 py-2 text-sm text-(--color-error) sm:col-span-4">
              {error}
            </p>
          )}
          <div className="sm:col-span-4">
            <button type="submit" disabled={busy} className={btn.primary}>
              {busy ? "Saving..." : "Save result"}
            </button>
          </div>
        </form>
      </Card>
      {removing && (
        <ConfirmDialog
          title={`Delete the result for ${removing.teamName}?`}
          body="The team is removed from the leaderboard. You can set a new result later."
          confirmLabel="Delete result"
          danger
          onConfirm={async () => {
            const ok = await deleteResult(tournament.id, removing.teamId);
            if (!ok) return REFUSED;
            showToast("Result deleted.");
            setRemoving(null);
            board.reload();
            return null;
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </section>
  );
}

export function TournamentManagePage() {
  const { showToast } = useToast();
  const overview = useAsync(fetchSiteTournamentOverview, []);
  const list = useAsync<Tournament[]>(fetchTournaments, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"none" | "new" | "edit">("none");
  const [decision, setDecision] = useState<{ team: Team; kind: Decision } | null>(null);
  const [memberTeam, setMemberTeam] = useState<Team | null>(null);

  const tournaments = list.data ?? [];
  useEffect(() => {
    if (!selectedId && tournaments.length > 0) setSelectedId((tournaments.find((t) => t.status !== "completed") ?? tournaments[0]).id);
  }, [selectedId, tournaments]);
  const selected = tournaments.find((t) => t.id === selectedId) ?? null;

  const teams = useAsync<Team[]>(() => (selectedId ? fetchTeams(selectedId) : Promise.resolve([])), [selectedId]);
  const members = useAsync<TeamMember[]>(() => (memberTeam ? fetchTeamMembers(memberTeam.id) : Promise.resolve([])), [memberTeam?.id]);

  const ov = overview.data;

  const teamColumns: Column<Team>[] = [
    { key: "team", header: "Team", sortValue: (r) => r.name.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.name}</span> },
    { key: "school", header: "School", sortValue: (r) => r.schoolName ?? "", render: (r) => r.schoolName ?? "Solo" },
    { key: "members", header: "Members", sortValue: (r) => r.memberCount, render: (r) => r.memberCount },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "pay", header: "Payment", render: (r) => (r.paymentDeclared ? <Badge tone="warn">Declared (unverified claim)</Badge> : <span className="text-(--color-mist)">None</span>) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={`${btn.secondary} px-3`} onClick={() => setMemberTeam(r)} aria-label={`Members of ${r.name}`}>
            Members
          </button>
          {(r.status === "applied" || r.status === "payment_declared") && (
            <>
              <button type="button" className={`${btn.primary} px-3`} onClick={() => setDecision({ team: r, kind: "verified" })} aria-label={`Verify ${r.name}`}>
                Verify
              </button>
              <button type="button" className={`${btn.danger} px-3`} onClick={() => setDecision({ team: r, kind: "rejected" })} aria-label={`Reject ${r.name}`}>
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tournament"
        subtitle="Run the RC tournament: teams, decisions and results."
        actions={
          <button type="button" className={btn.primary} onClick={() => setFormMode("new")}>
            New tournament
          </button>
        }
      />

      {overview.loading && !ov ? (
        <LoadingBlock />
      ) : overview.error ? (
        <ErrorBlock onRetry={overview.reload} />
      ) : ov ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Verified teams" value={countOf(ov.teams, "verified")} tone="good" />
          <StatCard label="Awaiting decision" value={ov.teamsAwaitingDecision} tone={ov.teamsAwaitingDecision > 0 ? "warn" : "neutral"} />
          <StatCard label="Rejected teams" value={countOf(ov.teams, "rejected")} />
          <StatCard label="Draft teams" value={countOf(ov.teams, "draft")} />
          <StatCard label="Schools with teams" value={ov.schoolsWithTeams} />
          <StatCard label="Solo teams" value={ov.soloTeams} />
          <StatCard label="Participants" value={ov.participants} />
          <StatCard label="Applied / payment declared" value={`${countOf(ov.teams, "applied")} / ${countOf(ov.teams, "payment_declared")}`} />
        </div>
      ) : null}

      <p className="mb-6 rounded-2xl bg-(--color-cloud) px-4 py-3 text-sm text-(--color-slate)">
        Payment is only a claim. A team ticking "payment declared" has not paid in any way the system can check. Verify a team only after you have confirmed payment yourself.
      </p>

      {formMode !== "none" && (
        <div className="mb-6">
          <TournamentForm
            key={formMode + (selected?.id ?? "")}
            editing={formMode === "edit" ? selected : null}
            onCancel={() => setFormMode("none")}
            onSaved={(id) => {
              setFormMode("none");
              if (id) setSelectedId(id);
              list.reload();
              overview.reload();
            }}
          />
        </div>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Tournaments</h2>
      {list.loading && !list.data ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock onRetry={list.reload} />
      ) : tournaments.length === 0 ? (
        <EmptyState title="No tournaments yet" body="Create the first one with the button above." />
      ) : (
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          {tournaments.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === selectedId}
              onClick={() => setSelectedId(t.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${t.id === selectedId ? "border-(--color-ink) bg-(--color-cloud)" : "border-(--color-line) bg-(--color-paper) hover:bg-(--color-cloud)"}`}
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-base font-semibold text-(--color-ink)">{t.title}</span>
                <StatusBadge status={t.status} />
              </span>
              <span className="mt-1 block text-sm text-(--color-slate)">
                {formatDateTime(t.startsAt)} to {formatDate(t.endsAt)} {t.venue ? `- ${t.venue}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-(--color-ink)">Teams in {selected.title}</h2>
            <button type="button" className={btn.secondary} onClick={() => setFormMode("edit")}>
              Edit tournament
            </button>
          </div>
          {teams.loading && !teams.data ? (
            <LoadingBlock />
          ) : teams.error ? (
            <ErrorBlock onRetry={teams.reload} />
          ) : (
            <DataTable columns={teamColumns} rows={teams.data ?? []} rowKey={(r) => r.id} emptyTitle="No teams yet" emptyBody="No team has entered this tournament." />
          )}
          {memberTeam && (
            <Card className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-(--color-ink)">Members of {memberTeam.name}</h3>
                <button type="button" className={btn.secondary} onClick={() => setMemberTeam(null)}>
                  Close
                </button>
              </div>
              {members.loading && !members.data ? (
                <LoadingBlock />
              ) : members.error ? (
                <ErrorBlock onRetry={members.reload} />
              ) : (members.data ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-(--color-slate)">No members.</p>
              ) : (
                <ul className="mt-2 divide-y divide-(--color-line)">
                  {(members.data ?? []).map((m) => (
                    <li key={m.studentId} className="flex justify-between gap-3 py-2 text-sm">
                      <span className="text-(--color-ink)">{m.fullName}</span>
                      <span className="text-(--color-slate)">joined {formatDate(m.joinedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          <ResultsSection tournament={selected} teams={teams.data ?? []} />
        </>
      )}

      {decision && (
        <ConfirmDialog
          title={decision.kind === "verified" ? `Verify ${decision.team.name}?` : `Reject ${decision.team.name}?`}
          body={
            <>
              {decision.kind === "verified" ? "The team is confirmed for the tournament and can be given a result." : "The team is rejected and cannot take part."}
              {decision.team.paymentDeclared && " Payment was only declared by the team. Make sure you have confirmed it."}
            </>
          }
          confirmLabel={decision.kind === "verified" ? "Verify team" : "Reject team"}
          danger={decision.kind === "rejected"}
          onConfirm={async () => {
            const ok = await decideTeam(decision.team.id, decision.kind);
            if (!ok) return REFUSED;
            showToast(decision.kind === "verified" ? "Team verified." : "Team rejected.");
            setDecision(null);
            teams.reload();
            overview.reload();
            return null;
          }}
          onCancel={() => setDecision(null)}
        />
      )}
    </>
  );
}
