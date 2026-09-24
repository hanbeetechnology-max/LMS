import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import {
  fetchLeaderboard,
  fetchMyTeams,
  fetchTeamMembers,
  fetchTournaments,
  type LeaderboardRow,
  type Team,
  type TeamMember,
  type Tournament,
} from "../../lib/tournamentPortalApi";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, formatDateTime, useAsync } from "../kit";
import { LatestAnnouncements, TEAM_STATUS_TEXT, useCountdown, useSchoolGone } from "./shared";

interface RcData {
  tournament: Tournament | null;
  team: Team | null;
  members: TeamMember[];
  top: LeaderboardRow[];
}

async function load(): Promise<RcData> {
  const tournaments = await fetchTournaments();
  const tournament = tournaments.find((t) => t.status !== "completed") ?? tournaments[tournaments.length - 1] ?? null;
  if (!tournament) return { tournament: null, team: null, members: [], top: [] };
  const [teams, board] = await Promise.all([fetchMyTeams(), fetchLeaderboard(tournament.id)]);
  const team = teams.find((t) => t.tournamentId === tournament.id && t.status !== "withdrawn") ?? null;
  const members = team ? await fetchTeamMembers(team.id) : [];
  return { tournament, team, members, top: board.slice(0, 3) };
}

function Countdown({ startsAt }: { startsAt: string }) {
  const c = useCountdown(startsAt);
  if (!c) return null;
  if (c.over) return <p className="font-display text-xl font-semibold text-(--color-ink)">Started</p>;
  const cells: [number, string][] = [
    [c.days, "days"],
    [c.hours, "hours"],
    [c.minutes, "min"],
    [c.seconds, "sec"],
  ];
  return (
    <div role="timer" aria-label="Time until the tournament starts" className="mt-4 flex gap-3">
      {cells.map(([v, l]) => (
        <div key={l} className="min-w-16 rounded-xl border border-(--color-line) bg-(--color-cloud) px-3 py-2 text-center">
          <p className="font-mono text-2xl font-semibold text-(--color-ink)">{String(v).padStart(2, "0")}</p>
          <p className="text-xs text-(--color-mist)">{l}</p>
        </div>
      ))}
    </div>
  );
}

export function RcOverviewPage() {
  const { profile } = useAuth();
  const gone = useSchoolGone();
  const { data, loading, error, reload } = useAsync(() => (gone ? Promise.resolve(null) : load()), [gone]);
  const isSchoolStudent = !!profile?.school && !profile.isSolo;

  return (
    <>
      <PageHeader
        title="Tournament"
        subtitle={isSchoolStudent && profile?.school ? `Representing ${profile.school.name}` : "Your upcoming tournament and team."}
      />
      {gone ? (
        <EmptyState title="Tournament is not available" body="Your school is no longer active. See the notice above to switch to a solo account." />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : !data || !data.tournament ? (
        <EmptyState title="No tournament yet" body="When HANBEE announces the next tournament it will show up here." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-(--color-mist)">Next tournament</p>
              <StatusBadge status={data.tournament.status} />
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-(--color-ink)">{data.tournament.title}</h2>
            <p className="mt-1 text-sm text-(--color-slate)">
              {formatDateTime(data.tournament.startsAt)} at {data.tournament.venue || "venue to be announced"}
            </p>
            <Countdown startsAt={data.tournament.startsAt} />
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-(--color-ink)">My team</h2>
              {data.team && <StatusBadge status={data.team.status} />}
            </div>
            {data.team ? (
              <>
                <p className="mt-2 font-display text-xl font-semibold text-(--color-ink)">{data.team.name}</p>
                <p className="mt-1 text-sm text-(--color-slate)">{TEAM_STATUS_TEXT[data.team.status]}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {data.members.map((m) => (
                    <li key={m.studentId}>
                      <Badge>{m.fullName}</Badge>
                    </li>
                  ))}
                </ul>
                <Link to="/student/rc/team" className="mt-3 inline-block text-sm font-medium text-(--color-violet) underline">
                  Team details
                </Link>
              </>
            ) : isSchoolStudent ? (
              <p className="mt-2 text-sm text-(--color-slate)">Your school staff will put you in a team.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-(--color-slate)">You are not in a team yet. You can enter as a team of one.</p>
                <Link to="/student/rc/team" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper)">
                  Enter the tournament
                </Link>
              </>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-(--color-ink)">Top three</h2>
              <Link to="/student/rc/leaderboard" className="text-sm font-medium text-(--color-violet) underline">
                Full leaderboard
              </Link>
            </div>
            {data.top.length === 0 ? (
              <p className="mt-3 text-sm text-(--color-slate)">Results will appear after the event.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {data.top.map((r) => (
                  <li key={r.teamId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-(--color-ink)">
                      <span className="mr-2 font-mono text-(--color-mist)">#{r.rank}</span>
                      {r.teamName}
                    </span>
                    <span className="font-mono text-(--color-slate)">{r.points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <div className="lg:col-span-2">
            <LatestAnnouncements />
          </div>
        </div>
      )}
    </>
  );
}
