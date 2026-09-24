import { useState } from "react";
import { fetchLeaderboard, fetchMyTeams, fetchTournaments } from "../../lib/tournamentPortalApi";
import { Badge, DataTable, EmptyState, ErrorBlock, LoadingBlock, PageHeader, useAsync } from "../kit";
import { useSchoolGone } from "./shared";

export function RcLeaderboardPage() {
  const gone = useSchoolGone();
  const [picked, setPicked] = useState<string | null>(null);
  const meta = useAsync(async () => {
    if (gone) return { tournaments: [], myTeamIds: new Set<string>() };
    const [tournaments, teams] = await Promise.all([fetchTournaments(), fetchMyTeams()]);
    return { tournaments, myTeamIds: new Set(teams.map((t) => t.id)) };
  }, [gone]);

  const tournaments = meta.data?.tournaments ?? [];
  const tournamentId = picked ?? tournaments.find((t) => t.status !== "completed")?.id ?? tournaments[0]?.id ?? null;
  const board = useAsync(() => (tournamentId ? fetchLeaderboard(tournamentId) : Promise.resolve([])), [tournamentId]);

  return (
    <>
      <PageHeader title="Leaderboard" subtitle="How the teams are ranked." />
      {meta.loading && !meta.data ? (
        <LoadingBlock />
      ) : meta.error ? (
        <ErrorBlock onRetry={meta.reload} />
      ) : tournaments.length === 0 ? (
        <EmptyState title="No tournament yet" body="The leaderboard appears once a tournament exists." />
      ) : (
        <>
          {tournaments.length > 1 && (
            <div className="mb-4">
              <label htmlFor="lb-tournament" className="mb-1 block text-sm font-medium text-(--color-ink)">
                Tournament
              </label>
              <select
                id="lb-tournament"
                value={tournamentId ?? ""}
                onChange={(e) => setPicked(e.target.value)}
                className="min-h-11 rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink)"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {board.loading && !board.data ? (
            <LoadingBlock />
          ) : board.error ? (
            <ErrorBlock onRetry={board.reload} />
          ) : (
            <DataTable
              rows={board.data ?? []}
              rowKey={(r) => r.teamId}
              emptyTitle="Results will appear after the event"
              columns={[
                { key: "rank", header: "Rank", render: (r) => <span className="font-mono">#{r.rank}</span>, sortValue: (r) => r.rank },
                {
                  key: "team",
                  header: "Team",
                  render: (r) => (
                    <span className="inline-flex items-center gap-2 font-medium text-(--color-ink)">
                      {r.teamName}
                      {meta.data?.myTeamIds.has(r.teamId) && <Badge tone="info">Your team</Badge>}
                    </span>
                  ),
                },
                { key: "school", header: "School", render: (r) => r.schoolName ?? "Solo entry" },
                { key: "points", header: "Points", render: (r) => <span className="font-mono">{r.points}</span>, sortValue: (r) => r.points },
              ]}
            />
          )}
        </>
      )}
    </>
  );
}
