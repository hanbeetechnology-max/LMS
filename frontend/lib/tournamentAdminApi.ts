import { authenticatedSupabaseFetch } from "./supabaseAuth";

export type TournamentStatus = "upcoming" | "live" | "completed";

export interface TournamentRecord {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  status: TournamentStatus;
  team_size: number;
}

export interface VerifiedTournamentTeam {
  id: string;
  tournament_id: string;
  name: string;
  org_id: string | null;
}

export interface TournamentResult {
  id: string;
  tournament_id: string;
  team_id: string;
  rank: number;
  points: number;
  notes: string;
}

async function rpc<T>(name: string, args: Record<string, unknown>) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export function listTournaments() {
  return authenticatedSupabaseFetch<TournamentRecord[]>(
    "/rest/v1/tournaments?select=id,title,description,starts_at,ends_at,venue,status,team_size&order=starts_at.desc",
  );
}

export function createTournament(input: Omit<TournamentRecord, "id" | "status" | "team_size">) {
  return rpc<string>("create_tournament", {
    p_title: input.title,
    p_description: input.description,
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_venue: input.venue,
  });
}

export function updateTournament(input: TournamentRecord) {
  return rpc<null>("update_tournament", {
    p_id: input.id,
    p_title: input.title,
    p_description: input.description,
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_venue: input.venue,
    p_status: input.status,
  });
}

export function listVerifiedTournamentTeams() {
  return authenticatedSupabaseFetch<VerifiedTournamentTeam[]>(
    "/rest/v1/tournament_teams?select=id,tournament_id,name,org_id&status=eq.verified&order=name.asc",
  );
}

export function listTournamentResults() {
  return authenticatedSupabaseFetch<TournamentResult[]>(
    "/rest/v1/tournament_results?select=id,tournament_id,team_id,rank,points,notes&order=rank.asc",
  );
}

export function saveTournamentResult(input: { tournamentId: string; teamId: string; rank: number; points: number; notes: string }) {
  return rpc<string>("set_result", {
    p_tournament: input.tournamentId,
    p_team: input.teamId,
    p_rank: input.rank,
    p_points: input.points,
    p_notes: input.notes,
  });
}

export function removeTournamentResult(input: { tournamentId: string; teamId: string }) {
  return rpc<null>("delete_result", { p_tournament: input.tournamentId, p_team: input.teamId });
}
