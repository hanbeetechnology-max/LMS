import { authenticatedSupabaseFetch, readStoredSession } from "./supabaseAuth";

export type TeamStatus = "draft" | "proposed" | "applied" | "payment_declared" | "verified" | "rejected" | "withdrawn";

export interface TeamFormationMember {
  student_id: string;
  name: string;
  is_captain: boolean;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  team_name: string;
  invited_by: string | null;
  members: number;
}

export interface MyTeamFormation {
  school_id: string | null;
  slots: { max_teams: number | null; used: number; remaining: number | null; team_size: number | null } | null;
  my_team: null | {
    id: string;
    name: string;
    status: TeamStatus;
    is_captain: boolean;
    staff_note: string;
    chat_id: string | null;
    members: TeamFormationMember[];
    pending_invites: Array<{ id: string; student_id: string; name: string }>;
  };
  invitations: TeamInvitation[];
  eligible_classmates: Array<{ student_id: string; name: string }>;
}

export interface SchoolTeamOverview {
  team_id: string;
  name: string;
  status: TeamStatus;
  captain_name: string | null;
  member_count: number;
  team_size: number;
  pending_invites: number;
  submitted_at: string | null;
  staff_note: string;
  chat_id: string | null;
}

export interface TeamStatistics {
  team: { id: string; name: string; status: TeamStatus; team_size: number; members_count: number };
  tournament: { id: string; title: string; starts_at: string; venue: string; status: string };
  result: null | { rank: number; points: number; notes: string };
  members: Array<TeamFormationMember & {
    lessons_completed: number;
    lessons_total: number;
    completion_pct: number;
    sessions: number;
    attendance_pct: number | null;
  }>;
}

export interface UpcomingTournament {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  team_size: number;
}

export interface TeamSlotStatus {
  max_teams: number | null;
  used: number;
  remaining: number | null;
  team_size: number | null;
}

export interface TournamentApplication {
  team_id: string;
  tournament_id: string;
  tournament_title: string;
  team_name: string;
  org_id: string | null;
  school_name: string | null;
  captain_name: string | null;
  member_count: number;
  status: string;
  payment_declared: boolean;
  submitted_at: string | null;
}

async function rpc<T>(functionName: string, args: Record<string, unknown>): Promise<T> {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function fetchUpcomingTournament(): Promise<UpcomingTournament | null> {
  const params = new URLSearchParams({
    select: "id,title,starts_at,venue,team_size",
    status: "eq.upcoming",
    order: "starts_at.asc",
    limit: "1",
  });
  const rows = await authenticatedSupabaseFetch<UpcomingTournament[]>(`/rest/v1/tournaments?${params}`);
  return rows[0] ?? null;
}

export async function fetchMyOrganizationId(): Promise<string | null> {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const params = new URLSearchParams({
    select: "org_id",
    user_id: `eq.${session.user.id}`,
    status: "eq.active",
    limit: "1",
  });
  const rows = await authenticatedSupabaseFetch<Array<{ org_id: string }>>(
    `/rest/v1/organization_members?${params}`,
  );
  return rows[0]?.org_id ?? null;
}

export function joinSchool(joinToken: string) {
  return rpc<{ result: string; school: string }>("join_school", { p_join_token: joinToken.trim() });
}

export async function fetchMySoloStatus() {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const rows = await authenticatedSupabaseFetch<Array<{ is_solo: boolean }>>(
    `/rest/v1/profiles?select=is_solo&id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
  );
  return rows[0]?.is_solo ?? false;
}

export function createSoloTournamentEntry(tournamentId: string) {
  return rpc<string>("create_solo_team", { p_tournament: tournamentId });
}

export function applyStudentTeam(teamId: string, paymentDeclared: boolean) {
  return rpc<null>("apply_team", { p_team: teamId, p_payment_declared: paymentDeclared });
}

export function fetchTournamentApplicationQueue() {
  return rpc<TournamentApplication[]>("tournament_application_queue", {});
}

export function decideTournamentApplication(teamId: string, decision: "verified" | "rejected") {
  return rpc<null>("decide_team", { p_team: teamId, p_decision: decision });
}

export function fetchMyTeamFormation(tournamentId: string) {
  return rpc<MyTeamFormation>("my_team_formation", { p_tournament: tournamentId });
}

export function fetchSchoolTeamOverview(tournamentId: string, organizationId: string) {
  return rpc<SchoolTeamOverview[]>("team_formation_overview", {
    p_tournament: tournamentId,
    p_org: organizationId,
  });
}

export function fetchTeamSlotStatus(tournamentId: string, organizationId?: string) {
  return rpc<TeamSlotStatus>("team_slot_status", {
    p_tournament: tournamentId,
    p_org: organizationId ?? null,
  });
}

export function fetchTeamStatistics(teamId: string) {
  return rpc<TeamStatistics>("team_statistics", { p_team: teamId });
}

export function startStudentTeam(tournamentId: string, name: string) {
  return rpc<string>("student_start_team", { p_tournament: tournamentId, p_name: name });
}

export function inviteStudentToTeam(teamId: string, studentId: string) {
  return rpc<string>("invite_to_team", { p_team: teamId, p_student: studentId });
}

export function answerTeamInvitation(invitationId: string, accept: boolean) {
  return rpc<null>("respond_team_invitation", { p_invitation: invitationId, p_accept: accept });
}

export function cancelTeamInvitation(invitationId: string) {
  return rpc<null>("cancel_team_invitation", { p_invitation: invitationId });
}

export function leaveStudentTeam(teamId: string) {
  return rpc<null>("leave_team", { p_team: teamId });
}

export function submitStudentTeam(teamId: string) {
  return rpc<null>("submit_team", { p_team: teamId });
}

export function returnTeamForChanges(teamId: string, note: string) {
  return rpc<null>("return_team", { p_team: teamId, p_note: note });
}

export function approveTeamApplication(teamId: string, paymentDeclared: boolean) {
  return rpc<null>("apply_team", { p_team: teamId, p_payment_declared: paymentDeclared });
}

export function setSchoolTeamSlots(tournamentId: string, organizationId: string, maxTeams: number) {
  return rpc<null>("set_team_slots", {
    p_tournament: tournamentId,
    p_org: organizationId,
    p_max: maxTeams,
  });
}
