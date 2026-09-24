import { supabase } from "./supabaseClient";

// Tournaments as teams, leaderboard, and course applications, on top of
// supabase/migrations/0027_tournaments_teams_applications.sql. Every write goes
// through a SECURITY DEFINER function that checks the caller's role and that
// their account and school are active; payment is only ever a CLAIM that
// Hanbee staff verify. Data-access layer only (see docs/PLAN.md).

export type TournamentStatus = "upcoming" | "live" | "completed";
export type TeamStatus = "draft" | "applied" | "payment_declared" | "verified" | "rejected" | "withdrawn";
export type ApplicationStatus = "applied" | "payment_declared" | "verified" | "rejected";
export type Decision = "verified" | "rejected";

export interface Tournament {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  status: TournamentStatus;
}

export interface TournamentInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  orgId: string | null; // null = solo team of one
  schoolName: string | null;
  name: string;
  status: TeamStatus;
  paymentDeclared: boolean;
  memberCount: number;
  createdAt: string;
}

export interface TeamMember {
  studentId: string;
  fullName: string;
  orgIdAtJoin: string | null;
  joinedAt: string;
}

export interface AddableStudent {
  studentId: string;
  fullName: string;
  email: string;
}

export interface LeaderboardRow {
  teamId: string;
  teamName: string;
  schoolName: string | null;
  rank: number;
  points: number;
  notes: string;
}

export interface CourseApplication {
  id: string;
  courseId: string;
  courseTitle: string;
  applicantId: string;
  applicantName: string;
  orgIdAtJoin: string | null;
  schoolName: string | null;
  status: ApplicationStatus;
  paymentDeclared: boolean;
  decidedAt: string | null;
  createdAt: string;
}

interface TournamentDbRow {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  status: TournamentStatus;
}

interface TeamDbRow {
  id: string;
  tournament_id: string;
  tournament_title: string;
  org_id: string | null;
  school_name: string | null;
  name: string;
  status: TeamStatus;
  payment_declared: boolean;
  member_count: number;
  created_at: string;
}

function mapTournament(r: TournamentDbRow): Tournament {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    venue: r.venue,
    status: r.status,
  };
}

/** Everything write-like returns a plain boolean (true = the server accepted it). */
async function callBool(fn: string, args: Record<string, unknown>): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc(fn, args);
  return !error;
}

async function callId(fn: string, args: Record<string, unknown>): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc(fn, args);
  if (error || typeof data !== "string") return null;
  return data;
}

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

/** Visible only to eligible accounts (see can_see_tournaments); others get []. */
export async function fetchTournaments(): Promise<Tournament[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, title, description, starts_at, ends_at, venue, status")
    .order("starts_at", { ascending: true });
  if (error || !data) return [];
  return (data as TournamentDbRow[]).map(mapTournament);
}

export async function fetchTournament(id: string): Promise<Tournament | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, title, description, starts_at, ends_at, venue, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapTournament(data as TournamentDbRow);
}

/** Hanbee staff / manager. Returns the new tournament id, or null. */
export async function createTournament(input: TournamentInput): Promise<string | null> {
  return callId("create_tournament", {
    p_title: input.title,
    p_description: input.description,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_venue: input.venue,
  });
}

/** Hanbee staff / manager. */
export async function updateTournament(id: string, input: TournamentInput, status: TournamentStatus): Promise<boolean> {
  return callBool("update_tournament", {
    p_id: id,
    p_title: input.title,
    p_description: input.description,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_venue: input.venue,
    p_status: status,
  });
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

/** Teams the caller may see: Hanbee sees all, school staff their school's,
 *  a student or solo entrant their own. Optionally one tournament. */
export async function fetchTeams(tournamentId?: string): Promise<Team[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_visible_teams", { p_tournament: tournamentId ?? null });
  if (error || !data) return [];
  return (data as TeamDbRow[]).map((r) => ({
    id: r.id,
    tournamentId: r.tournament_id,
    tournamentTitle: r.tournament_title,
    orgId: r.org_id,
    schoolName: r.school_name,
    name: r.name,
    status: r.status,
    paymentDeclared: r.payment_declared,
    memberCount: r.member_count,
    createdAt: r.created_at,
  }));
}

/** The caller's own team(s) (students, solo entrants), or their school's for staff. */
export async function fetchMyTeams(): Promise<Team[]> {
  return fetchTeams();
}

/** The caller's school's teams (school staff). Same visibility as fetchTeams. */
export async function fetchSchoolTeams(tournamentId?: string): Promise<Team[]> {
  return fetchTeams(tournamentId);
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_team_roster", { p_team: teamId });
  if (error || !data) return [];
  return (
    data as { student_id: string; full_name: string; org_id_at_join: string | null; joined_at: string }[]
  ).map((r) => ({
    studentId: r.student_id,
    fullName: r.full_name,
    orgIdAtJoin: r.org_id_at_join,
    joinedAt: r.joined_at,
  }));
}

/** School staff: their school's active students not yet in a team of this tournament. */
export async function fetchAddableStudents(tournamentId: string): Promise<AddableStudent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_addable_students", { p_tournament: tournamentId });
  if (error || !data) return [];
  return (data as { student_id: string; full_name: string; email: string }[]).map((r) => ({
    studentId: r.student_id,
    fullName: r.full_name,
    email: r.email,
  }));
}

/** School staff of an active school. Returns the new team id, or null. */
export async function createTeam(tournamentId: string, name: string): Promise<string | null> {
  return callId("create_team", { p_tournament: tournamentId, p_name: name });
}

/** Solo student entering as a team of one. Returns the new team id, or null. */
export async function createSoloTeam(tournamentId: string): Promise<string | null> {
  return callId("create_solo_team", { p_tournament: tournamentId });
}

/** School staff, own school's active students only, while the team is a draft. */
export async function addTeamMember(teamId: string, studentId: string): Promise<boolean> {
  return callBool("add_team_member", { p_team: teamId, p_student: studentId });
}

export async function removeTeamMember(teamId: string, studentId: string): Promise<boolean> {
  return callBool("remove_team_member", { p_team: teamId, p_student: studentId });
}

/** draft -> applied (or payment_declared when the self-declaration box was ticked).
 *  Only the team's school staff or the solo student. Needs at least one member. */
export async function applyTeam(teamId: string, paymentDeclared: boolean): Promise<boolean> {
  return callBool("apply_team", { p_team: teamId, p_payment_declared: paymentDeclared });
}

export async function withdrawTeam(teamId: string): Promise<boolean> {
  return callBool("withdraw_team", { p_team: teamId });
}

/** Hanbee staff / manager only. */
export async function decideTeam(teamId: string, decision: Decision): Promise<boolean> {
  return callBool("decide_team", { p_team: teamId, p_decision: decision });
}

// ---------------------------------------------------------------------------
// Results and leaderboard
// ---------------------------------------------------------------------------

/** Team name and school name only. Empty for accounts not eligible to see tournaments. */
export async function fetchLeaderboard(tournamentId: string): Promise<LeaderboardRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_leaderboard", { p_tournament: tournamentId });
  if (error || !data) return [];
  return (
    data as {
      team_id: string;
      team_name: string;
      school_name: string | null;
      rank: number;
      points: number;
      notes: string;
    }[]
  ).map((r) => ({
    teamId: r.team_id,
    teamName: r.team_name,
    schoolName: r.school_name,
    rank: r.rank,
    points: r.points,
    notes: r.notes,
  }));
}

/** Hanbee staff / manager. Only for a verified team of that tournament. */
export async function setResult(
  tournamentId: string,
  teamId: string,
  rank: number,
  points: number,
  notes: string,
): Promise<boolean> {
  return callBool("set_result", {
    p_tournament: tournamentId,
    p_team: teamId,
    p_rank: rank,
    p_points: points,
    p_notes: notes,
  });
}

export async function deleteResult(tournamentId: string, teamId: string): Promise<boolean> {
  return callBool("delete_result", { p_tournament: tournamentId, p_team: teamId });
}

// ---------------------------------------------------------------------------
// Course applications and enrollment
// ---------------------------------------------------------------------------

/** Student (school member or solo). Returns the application id, or null. */
export async function applyForCourse(courseId: string, paymentDeclared: boolean): Promise<string | null> {
  return callId("apply_for_course", { p_course: courseId, p_payment_declared: paymentDeclared });
}

/** Hanbee staff/manager see all; a school's staff see their students' (read-only);
 *  a student sees their own. */
export async function fetchCourseApplications(): Promise<CourseApplication[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_course_applications");
  if (error || !data) return [];
  return (
    data as {
      id: string;
      course_id: string;
      course_title: string;
      applicant_id: string;
      applicant_name: string;
      org_id_at_join: string | null;
      school_name: string | null;
      status: ApplicationStatus;
      payment_declared: boolean;
      decided_at: string | null;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    courseTitle: r.course_title,
    applicantId: r.applicant_id,
    applicantName: r.applicant_name,
    orgIdAtJoin: r.org_id_at_join,
    schoolName: r.school_name,
    status: r.status,
    paymentDeclared: r.payment_declared,
    decidedAt: r.decided_at,
    createdAt: r.created_at,
  }));
}

/** Hanbee staff / manager. `sectionId` is required when verifying; the active
 *  enrollment is created server-side. */
export async function decideCourseApplication(
  applicationId: string,
  decision: Decision,
  sectionId?: string,
): Promise<boolean> {
  return callBool("decide_course_application", {
    p_application: applicationId,
    p_decision: decision,
    p_section: sectionId ?? null,
  });
}

/** Hanbee staff / manager add an active student to a section. Returns the enrollment id. */
export async function enrollStudent(studentId: string, sectionId: string): Promise<string | null> {
  return callId("enroll_student", { p_student: studentId, p_section: sectionId });
}
