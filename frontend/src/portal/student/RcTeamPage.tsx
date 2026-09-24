import { useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { useToast } from "../../lib/ToastProvider";
import { ScanToPayCard } from "../../components/ui/ScanToPayCard";
import {
  applyTeam,
  createSoloTeam,
  fetchMyTeams,
  fetchTeamMembers,
  fetchTournaments,
  type Team,
  type TeamMember,
  type Tournament,
} from "../../lib/tournamentPortalApi";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, formatDate, useAsync } from "../kit";
import { TEAM_STATUS_TEXT, useSchoolGone } from "./shared";

interface TeamData {
  tournament: Tournament | null;
  team: Team | null;
  members: TeamMember[];
}

async function load(): Promise<TeamData> {
  const tournaments = await fetchTournaments();
  const tournament = tournaments.find((t) => t.status !== "completed") ?? tournaments[tournaments.length - 1] ?? null;
  if (!tournament) return { tournament: null, team: null, members: [] };
  const teams = await fetchMyTeams();
  const team = teams.find((t) => t.tournamentId === tournament.id && t.status !== "withdrawn") ?? null;
  const members = team ? await fetchTeamMembers(team.id) : [];
  return { tournament, team, members };
}

export function RcTeamPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const gone = useSchoolGone();
  const { data, loading, error, reload } = useAsync(() => (gone ? Promise.resolve(null) : load()), [gone]);
  const [busy, setBusy] = useState(false);
  const [declared, setDeclared] = useState(false);
  const isSolo = !!profile?.isSolo || !profile?.school;

  async function enter(tournamentId: string) {
    setBusy(true);
    const id = await createSoloTeam(tournamentId);
    setBusy(false);
    if (id) {
      showToast("Team of one created. Now send your application.");
      reload();
    } else {
      showToast("Could not create your team. You may already have one for this tournament.", "error");
    }
  }

  async function apply(teamId: string) {
    setBusy(true);
    const ok = await applyTeam(teamId, declared);
    setBusy(false);
    if (ok) {
      showToast("Application sent. HANBEE will check it.");
      reload();
    } else {
      showToast("Could not send the application. Please try again.", "error");
    }
  }

  return (
    <>
      <PageHeader title="My team" subtitle="Your team for the tournament and its status." />
      {gone ? (
        <EmptyState title="Tournament is not available" body="Your school is no longer active. Switch to a solo account to enter on your own." />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : !data || !data.tournament ? (
        <EmptyState title="No tournament yet" body="You can enter a team once HANBEE announces a tournament." />
      ) : data.team ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-(--color-mist)">{data.team.tournamentTitle}</p>
              <StatusBadge status={data.team.status} />
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-(--color-ink)">{data.team.name}</h2>
            <p className="mt-2 text-sm text-(--color-slate)">{TEAM_STATUS_TEXT[data.team.status]}</p>
            <p className="mt-1 text-xs text-(--color-mist)">
              {data.team.schoolName ? `School: ${data.team.schoolName}. ` : "Solo entry. "}Created {formatDate(data.team.createdAt)}.
            </p>
            {!isSolo && <p className="mt-3 text-sm text-(--color-slate)">Your school staff manage the team. You can see it here but not change it.</p>}
            <p className="mt-3 text-xs text-(--color-mist)">HANBEE checks every payment. Nothing is confirmed until it says Verified.</p>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-semibold text-(--color-ink)">Members</h2>
            {data.members.length === 0 ? (
              <p className="mt-3 text-sm text-(--color-slate)">No members yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.members.map((m) => (
                  <li key={m.studentId} className="flex items-center justify-between text-sm">
                    <span className="text-(--color-ink)">{m.fullName}</span>
                    <Badge>Joined {formatDate(m.joinedAt)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {isSolo && data.team.status === "draft" && (
            <div className="space-y-4 lg:col-span-2">
              <h2 className="font-display text-lg font-semibold text-(--color-ink)">Send your application</h2>
              <ScanToPayCard amountLabel="tournament entry fee" confirmed={declared} onConfirmedChange={setDeclared} />
              <p className="text-sm text-(--color-slate)">Payment is optional for now. HANBEE verifies payment by hand, so ticking the box only tells them you paid.</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void apply(data.team!.id)}
                className="min-h-11 rounded-full bg-(--color-ink) px-6 text-sm font-semibold text-(--color-paper) disabled:opacity-60"
              >
                {busy ? "Sending..." : "Apply"}
              </button>
            </div>
          )}
        </div>
      ) : isSolo ? (
        <Card>
          <h2 className="font-display text-xl font-semibold text-(--color-ink)">{data.tournament.title}</h2>
          <p className="mt-2 max-w-xl text-sm text-(--color-slate)">
            You are not part of a school, so you can enter as a team of one. First we create your team, then you send your application.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void enter(data.tournament!.id)}
            className="mt-4 min-h-11 rounded-full bg-(--color-ink) px-6 text-sm font-semibold text-(--color-paper) disabled:opacity-60"
          >
            {busy ? "Creating..." : "Enter as a team of one"}
          </button>
        </Card>
      ) : (
        <EmptyState title="No team yet" body="Your school staff will put you in a team." />
      )}
    </>
  );
}
