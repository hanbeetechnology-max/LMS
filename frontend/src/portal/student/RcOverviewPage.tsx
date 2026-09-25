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
import { Badge, Card, EmptyState, ErrorBlock, Eyebrow, LoadingBlock, PageHeader, StatCard, StatusBadge, formatDateTime, useAsync } from "../kit";
import { LatestAnnouncements, TEAM_STATUS_TEXT, primaryBtn, textLink, useAnnouncementCount, useCountdown, useSchoolGone } from "./shared";

interface RcData {
  tournament: Tournament | null;
  team: Team | null;
  members: TeamMember[];
  top: LeaderboardRow[];
  myRank: number | null;
}

async function load(): Promise<RcData> {
  const tournaments = await fetchTournaments();
  const tournament = tournaments.find((t) => t.status !== "completed") ?? tournaments[tournaments.length - 1] ?? null;
  if (!tournament) return { tournament: null, team: null, members: [], top: [], myRank: null };
  const [teams, board] = await Promise.all([fetchMyTeams(), fetchLeaderboard(tournament.id)]);
  const team = teams.find((t) => t.tournamentId === tournament.id && t.status !== "withdrawn") ?? null;
  const members = team ? await fetchTeamMembers(team.id) : [];
  const myRank = team ? (board.find((r) => r.teamId === team.id)?.rank ?? null) : null;
  return { tournament, team, members, top: board.slice(0, 3), myRank };
}

function Countdown({ startsAt }: { startsAt: string }) {
  const c = useCountdown(startsAt);
  if (!c) return null;
  if (c.over) return <p className="mt-4 text-xl font-semibold text-(--color-ink)">Started</p>;
  const cells: [number, string][] = [
    [c.days, "days"],
    [c.hours, "hours"],
    [c.minutes, "min"],
    [c.seconds, "sec"],
  ];
  return (
    <div role="timer" aria-label="Time until the tournament starts" className="mt-4 flex flex-wrap gap-3">
      {cells.map(([v, l]) => (
        <div key={l} className="min-w-16 rounded-lg border border-(--color-line) bg-(--color-canvas) px-3 py-2 text-center">
          <p className="text-2xl font-semibold tabular-nums text-(--color-ink)">{String(v).padStart(2, "0")}</p>
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
  const announcements = useAnnouncementCount();
  const isSchoolStudent = !!profile?.school && !profile.isSolo;
  const c = useCountdown(data?.tournament?.startsAt);
  const days = c ? (c.over ? "Started" : c.days) : "-";

  return (
    <>
      <PageHeader
        title="Tournament"
        subtitle={isSchoolStudent && profile?.school ? `Representing ${profile.school.name}` : "Your upcoming tournament and team."}
      />
      {gone ? (
        <EmptyState title="Tournament is not available" body="Your school is no longer active. Use the notice above to choose what happens next." />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : !data || !data.tournament ? (
        <EmptyState title="No tournament yet" body="When HANBEE announces the next tournament it will show up here." />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Days to event" value={days} />
            <StatCard label="My team" value={data.team ? data.team.status.replace(/_/g, " ") : "None yet"} />
            <StatCard label="My rank" value={data.myRank ? `#${data.myRank}` : "-"} />
            <StatCard label="Announcements" value={announcements ?? "-"} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow>Next tournament</Eyebrow>
                <StatusBadge status={data.tournament.status} />
              </div>
              <h2 className="mt-2 text-xl font-semibold text-(--color-ink)">{data.tournament.title}</h2>
              <p className="mt-1 text-sm text-(--color-slate)">
                {formatDateTime(data.tournament.startsAt)} at {data.tournament.venue || "venue to be announced"}
              </p>
              <Countdown startsAt={data.tournament.startsAt} />
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2">
                <Eyebrow>My team</Eyebrow>
                {data.team && <StatusBadge status={data.team.status} />}
              </div>
              {data.team ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-(--color-ink)">{data.team.name}</p>
                  <p className="mt-1 text-sm text-(--color-slate)">{TEAM_STATUS_TEXT[data.team.status]}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {data.members.map((m) => (
                      <li key={m.studentId}>
                        <Badge>{m.fullName}</Badge>
                      </li>
                    ))}
                  </ul>
                  <Link to="/student/rc/team" className={`mt-2 ${textLink}`}>
                    Team details
                  </Link>
                </>
              ) : isSchoolStudent ? (
                <p className="mt-2 text-sm text-(--color-slate)">Your school staff will put you in a team.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-(--color-slate)">You are not in a team yet. You can enter as a team of one.</p>
                  <Link to="/student/rc/team" className={`mt-3 ${primaryBtn}`}>
                    Enter the tournament
                  </Link>
                </>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2">
                <Eyebrow>Top three</Eyebrow>
                <Link to="/student/rc/leaderboard" className={textLink}>
                  Full leaderboard
                </Link>
              </div>
              {data.top.length === 0 ? (
                <p className="mt-3 text-sm text-(--color-slate)">Results will appear after the event.</p>
              ) : (
                <ol className="mt-3 divide-y divide-(--color-line)">
                  {data.top.map((r) => (
                    <li key={r.teamId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="text-(--color-ink)">
                        <span className="mr-2 text-(--color-mist)">#{r.rank}</span>
                        {r.teamName}
                      </span>
                      <span className="tabular-nums text-(--color-slate)">{r.points} pts</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <div className="lg:col-span-2">
              <LatestAnnouncements />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
