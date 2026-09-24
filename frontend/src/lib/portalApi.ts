import { supabase } from "./supabaseClient";

/* Data access for the multi-school portal: signup paths, schools, invites,
   verification, dashboard overviews, and account/school status. Every rule is
   enforced in the database (migrations 0022-0032); these are thin typed
   wrappers. See docs/MULTI_SCHOOL_PLATFORM.md. Follows the conventions of
   rosterApi.ts: `if (!supabase)` guards, plain data or boolean returns. */

/* ------------------------------------------------------------------ types */

export type AccountStatus = "active" | "suspended" | "revoked";
export type SchoolStatus = "pending" | "active" | "suspended" | "closed";
export type MemberRole = "owner" | "staff" | "student";

export interface MySchool {
  orgId: string;
  name: string;
  status: SchoolStatus;
  memberRole: MemberRole;
  memberStatus: "active" | "ended";
}

export interface SchoolOverview {
  school: { id: string; name: string; status: SchoolStatus; registrationNo: string; officialEmail: string; createdAt: string; verifiedAt: string | null; verifiedBy: string | null };
  people: { owners: number; staff: number; students: number; pendingInvites: number };
  tournament: {
    teamsTotal: number;
    teamsByStatus: Record<string, number>;
    participants: number;
    nextTournament: { id: string; title: string; startsAt: string; venue: string; status: string } | null;
    bestRank: number | null;
  };
  lms: { studentsEnrolled: number; enrollments: number; lessonsCompleted: number; avgCompletionPct: number };
}

export interface SchoolStudent {
  studentId: string;
  fullName: string;
  email: string;
  joinedAt: string;
  accountStatus: AccountStatus;
  teamName: string | null;
  teamStatus: string | null;
  coursesEnrolled: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  completionPct: number;
  lastActive: string | null;
}

export interface SchoolCourseParticipation {
  courseId: string;
  title: string;
  students: number;
  avgCompletionPct: number;
}

export interface CourseStudentRow {
  studentId: string;
  fullName: string;
  email: string;
  orgId: string | null;
  orgName: string | null;
  orgStatus: SchoolStatus | null;
  isSolo: boolean;
  enrollmentId: string;
  sectionName: string;
  status: string;
  enrolledOn: string;
  completed: number;
  total: number;
  completionPct: number;
  lastActivity: string | null;
  /** Enrolled in the last 14 days. */
  isNew: boolean;
}

export interface CourseStats {
  courseId: string;
  title: string;
  description: string;
  status: string;
  coverAccent: string;
  students: number;
  avgCompletionPct: number;
  newStudents: number;
}

export interface SchoolDirectoryRow {
  orgId: string;
  name: string;
  status: SchoolStatus;
  ownerName: string | null;
  ownerEmail: string | null;
  students: number;
  teams: number;
  participants: number;
  createdAt: string;
  verifiedBy: string | null;
}

export interface MyCourseProgress {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  sectionName: string;
  status: string;
  enrolledOn: string;
  completed: number;
  total: number;
  completionPct: number;
  lastActivity: string | null;
}

export interface HanbeeStaffOverviewRow {
  staffId: string;
  fullName: string;
  email: string;
  approved: boolean;
  accountStatus: AccountStatus;
  hoursLast7Days: number;
  daysWorkedLast30: number;
  openTasks: number;
  doneTasks: number;
  lastClockIn: string | null;
}

export interface SiteTournamentOverview {
  tournaments: Record<string, number>;
  teams: Record<string, number>;
  schoolsWithTeams: number;
  soloTeams: number;
  participants: number;
  teamsAwaitingDecision: number;
}

export interface SiteLmsOverview {
  courses: Record<string, number>;
  students: number;
  soloStudents: number;
  enrollments: number;
  avgCompletionPct: number;
  courseApplicationsPending: number;
  schools: Record<string, number>;
}

export type InviteResult = "invited" | "already_invited" | "invalid_email" | "duplicate_in_list" | "unavailable";
export interface InviteOutcome {
  email: string;
  result: InviteResult;
}

export type InvitationState = "pending" | "joined" | "revoked" | "expired";
export interface SchoolInvitation {
  id: string;
  email: string;
  role: "student" | "school_staff";
  state: InvitationState;
  createdAt: string;
  expiresAt: string;
}

export interface VerifyOutcome {
  result: "verified" | "rejected" | "already_decided";
  status?: string;
  by?: string | null;
}

export interface PendingHanbeeStaff {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

/* ---------------------------------------------------------------- helpers */

type Row = Record<string, any>;

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc(name, args);
  if (error) return null;
  return data as T;
}

async function rpcRows(name: string, args?: Record<string, unknown>): Promise<Row[]> {
  const data = await rpc<Row[]>(name, args);
  return Array.isArray(data) ? data : [];
}

/* ----------------------------------------------------------------- signup
   Signup is invite-only in the database (0024). Each function below is one of
   the allowed paths; anything else is refused by the trigger. After a
   successful signup the caller signs the person in through AuthProvider. */

export interface SignupResult {
  ok: boolean;
  error?: string;
}

async function signUp(email: string, password: string, data: Record<string, unknown>): Promise<SignupResult> {
  if (!supabase) return { ok: false, error: "The service is not reachable right now." };
  const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data } });
  if (error) {
    // Supabase masks the database's own message as "Database error saving new user".
    return { ok: false, error: /database error/i.test(error.message) ? "We could not create this account. Check the invitation and try again." : error.message };
  }
  return { ok: true };
}

/** A new school registers itself (pending until the manager or Hanbee staff verify it). */
export function registerSchool(input: {
  email: string;
  password: string;
  fullName: string;
  schoolName: string;
  registrationNo: string;
  officialEmail: string;
  guardianConsent: boolean;
}): Promise<SignupResult> {
  return signUp(input.email, input.password, {
    role: "school_staff",
    full_name: input.fullName,
    school_name: input.schoolName,
    registration_no: input.registrationNo,
    official_email: input.officialEmail,
    guardian_consent: input.guardianConsent ? "true" : "false",
  });
}

/** A student joins their school with the school's shared link; the email must be on its list. */
export function joinWithSchoolLink(input: { joinToken: string; email: string; password: string; fullName: string }): Promise<SignupResult> {
  return signUp(input.email, input.password, { join_token: input.joinToken, full_name: input.fullName });
}

/** A personal invitation: solo student, co-staff, or a manager-created Hanbee staff or manager account. */
export function acceptPersonalInvite(input: { inviteToken: string; email: string; password: string; fullName: string }): Promise<SignupResult> {
  return signUp(input.email, input.password, { invite_token: input.inviteToken, full_name: input.fullName });
}

/** Hanbee staff application (unapproved until the manager approves). */
export function applyAsHanbeeStaff(input: { email: string; password: string; fullName: string }): Promise<SignupResult> {
  return signUp(input.email, input.password, { role: "staff", full_name: input.fullName });
}

export async function getJoinInfo(joinToken: string): Promise<{ schoolName: string } | null> {
  const rows = await rpcRows("get_join_info", { p_token: joinToken });
  return rows[0] ? { schoolName: rows[0].school_name } : null;
}

export type PreflightResult = "ok" | "invalid_link" | "not_invited";
export async function preflightJoin(joinToken: string, email: string): Promise<PreflightResult | null> {
  return rpc<PreflightResult>("preflight_join", { p_token: joinToken, p_email: email });
}

/** An existing student (solo, or their old school closed) joins a new school. */
export async function joinSchool(joinToken: string): Promise<{ ok: boolean; schoolName?: string; error?: string }> {
  if (!supabase) return { ok: false, error: "The service is not reachable right now." };
  const { data, error } = await supabase.rpc("join_school", { p_join_token: joinToken });
  if (error) return { ok: false, error: error.message };
  return { ok: true, schoolName: (data as Row)?.school };
}

/* --------------------------------------------------------------- my state */

export async function fetchMySchool(): Promise<MySchool | null> {
  const rows = await rpcRows("my_school");
  const r = rows[0];
  return r ? { orgId: r.org_id, name: r.name, status: r.status, memberRole: r.member_role, memberStatus: r.member_status } : null;
}

export async function fetchMyCourseProgress(): Promise<MyCourseProgress[]> {
  return (await rpcRows("my_course_progress")).map((r) => ({
    enrollmentId: r.enrollment_id, courseId: r.course_id, courseTitle: r.course_title, sectionName: r.section_name,
    status: r.status, enrolledOn: r.enrolled_on, completed: r.completed, total: r.total,
    completionPct: r.completion_pct, lastActivity: r.last_activity,
  }));
}

/* ----------------------------------------------------------------- invites */

export async function inviteStudents(orgId: string, emails: string[]): Promise<InviteOutcome[]> {
  return (await rpcRows("invite_students", { p_org: orgId, p_emails: emails })).map((r) => ({ email: r.email, result: r.result }));
}

export async function inviteSchoolStaff(orgId: string, email: string): Promise<string | null> {
  return rpc<string>("invite_school_staff", { p_org: orgId, p_email: email });
}

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  return (await rpc<boolean>("revoke_invitation", { p_invitation: invitationId })) === true;
}

export async function fetchSchoolInvitations(orgId: string): Promise<SchoolInvitation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, accepted, revoked_at, expires_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const now = Date.now();
  return data.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    state: r.accepted ? "joined" : r.revoked_at ? "revoked" : new Date(r.expires_at).getTime() < now ? "expired" : "pending",
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

/** The school's shared join link (school staff, Hanbee staff and the manager can read it). */
export async function fetchSchoolJoinLink(orgId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("organizations").select("join_token").eq("id", orgId).single();
  if (error || !data) return null;
  return `${window.location.origin}/join/${data.join_token}`;
}

/* ------------------------------------------------------------ verification */

export async function verifySchool(orgId: string): Promise<VerifyOutcome | null> {
  return rpc<VerifyOutcome>("verify_school", { p_org: orgId });
}

export async function rejectSchool(orgId: string): Promise<VerifyOutcome | null> {
  return rpc<VerifyOutcome>("reject_school", { p_org: orgId });
}

export async function fetchPendingHanbeeStaff(): Promise<PendingHanbeeStaff[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "staff")
    .eq("approved", false)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, fullName: r.full_name, email: r.email, createdAt: r.created_at }));
}

/** Manager only (database policy). */
export async function approveHanbeeStaff(profileId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", profileId);
  return !error;
}

/* ------------------------------------------------------ dashboard overviews */

export async function fetchSchoolOverview(orgId: string): Promise<SchoolOverview | null> {
  const r = await rpc<Row>("school_overview", { p_org: orgId });
  if (!r) return null;
  return {
    school: {
      id: r.school.id, name: r.school.name, status: r.school.status, registrationNo: r.school.registration_no,
      officialEmail: r.school.official_email, createdAt: r.school.created_at, verifiedAt: r.school.verified_at, verifiedBy: r.school.verified_by,
    },
    people: { owners: r.people.owners, staff: r.people.staff, students: r.people.students, pendingInvites: r.people.pending_invites },
    tournament: {
      teamsTotal: r.tournament.teams_total,
      teamsByStatus: r.tournament.teams_by_status ?? {},
      participants: r.tournament.participants,
      nextTournament: r.tournament.next_tournament
        ? { id: r.tournament.next_tournament.id, title: r.tournament.next_tournament.title, startsAt: r.tournament.next_tournament.starts_at, venue: r.tournament.next_tournament.venue, status: r.tournament.next_tournament.status }
        : null,
      bestRank: r.tournament.best_rank,
    },
    lms: { studentsEnrolled: r.lms.students_enrolled, enrollments: r.lms.enrollments, lessonsCompleted: r.lms.lessons_completed, avgCompletionPct: Number(r.lms.avg_completion_pct) },
  };
}

export async function fetchSchoolStudents(orgId: string): Promise<SchoolStudent[]> {
  return (await rpcRows("school_students", { p_org: orgId })).map((r) => ({
    studentId: r.student_id, fullName: r.full_name, email: r.email, joinedAt: r.joined_at, accountStatus: r.account_status,
    teamName: r.team_name, teamStatus: r.team_status, coursesEnrolled: r.courses_enrolled, lessonsCompleted: r.lessons_completed,
    lessonsTotal: r.lessons_total, completionPct: r.completion_pct, lastActive: r.last_active,
  }));
}

export async function fetchSchoolCourseParticipation(orgId: string): Promise<SchoolCourseParticipation[]> {
  return (await rpcRows("school_course_participation", { p_org: orgId })).map((r) => ({
    courseId: r.course_id, title: r.title, students: r.students, avgCompletionPct: r.avg_completion_pct,
  }));
}

export async function fetchCourseStudents(courseId: string): Promise<CourseStudentRow[]> {
  return (await rpcRows("course_students", { p_course: courseId })).map((r) => ({
    studentId: r.student_id, fullName: r.full_name, email: r.email, orgId: r.org_id, orgName: r.org_name, orgStatus: r.org_status,
    isSolo: r.is_solo, enrollmentId: r.enrollment_id, sectionName: r.section_name, status: r.status, enrolledOn: r.enrolled_on,
    completed: r.completed, total: r.total, completionPct: r.completion_pct, lastActivity: r.last_activity, isNew: r.is_new,
  }));
}

export async function fetchCourseStats(): Promise<CourseStats[]> {
  return (await rpcRows("course_stats")).map((r) => ({
    courseId: r.course_id, title: r.title, description: r.description, status: r.status, coverAccent: r.cover_accent,
    students: r.students, avgCompletionPct: r.avg_completion_pct, newStudents: r.new_students,
  }));
}

export async function fetchSchoolDirectory(): Promise<SchoolDirectoryRow[]> {
  return (await rpcRows("school_directory")).map((r) => ({
    orgId: r.org_id, name: r.name, status: r.status, ownerName: r.owner_name, ownerEmail: r.owner_email, students: r.students,
    teams: r.teams, participants: r.participants, createdAt: r.created_at, verifiedBy: r.verified_by,
  }));
}

export async function fetchSiteTournamentOverview(): Promise<SiteTournamentOverview | null> {
  const r = await rpc<Row>("site_tournament_overview");
  return r
    ? { tournaments: r.tournaments ?? {}, teams: r.teams ?? {}, schoolsWithTeams: r.schools_with_teams, soloTeams: r.solo_teams, participants: r.participants, teamsAwaitingDecision: r.teams_awaiting_decision }
    : null;
}

export async function fetchSiteLmsOverview(): Promise<SiteLmsOverview | null> {
  const r = await rpc<Row>("site_lms_overview");
  return r
    ? { courses: r.courses ?? {}, students: r.students, soloStudents: r.solo_students, enrollments: r.enrollments, avgCompletionPct: Number(r.avg_completion_pct), courseApplicationsPending: r.course_applications_pending, schools: r.schools ?? {} }
    : null;
}

/** Manager only. */
export async function fetchHanbeeStaffOverview(): Promise<HanbeeStaffOverviewRow[]> {
  return (await rpcRows("hanbee_staff_overview")).map((r) => ({
    staffId: r.staff_id, fullName: r.full_name, email: r.email, approved: r.approved, accountStatus: r.account_status,
    hoursLast7Days: Number(r.hours_last_7_days), daysWorkedLast30: r.days_worked_last_30, openTasks: r.open_tasks,
    doneTasks: r.done_tasks, lastClockIn: r.last_clock_in,
  }));
}

/* ------------------------------------------------------------ status changes */

export async function setAccountStatus(userId: string, status: AccountStatus, reason?: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("set_account_status", { p_user: userId, p_status: status, p_reason: reason ?? null });
  return !error;
}

export async function setSchoolStatus(orgId: string, status: Exclude<SchoolStatus, "pending">, reason?: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("set_school_status", { p_org: orgId, p_status: status, p_reason: reason ?? null });
  return !error;
}

/** A student with no school converts themselves (omit studentId); Hanbee staff or the manager may convert any student. */
export async function convertToSolo(studentId?: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("convert_to_solo", { p_student: studentId ?? null });
  return !error;
}

/* -------------------------------------------------------------------- audit */

export async function fetchAuditLog(limit = 50): Promise<AuditEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, target_type, target_id, meta, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: Row) => ({
    id: r.id, actorName: r.profiles?.full_name ?? null, action: r.action, targetType: r.target_type,
    targetId: r.target_id, meta: r.meta ?? {}, createdAt: r.created_at,
  }));
}
