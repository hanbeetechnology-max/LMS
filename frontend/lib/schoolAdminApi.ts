import { authenticatedSupabaseFetch } from "./supabaseAuth";

export interface SchoolDirectoryRow {
  org_id: string;
  name: string;
  status: string;
  owner_name: string | null;
  owner_email: string | null;
  students: number;
  teams: number;
  participants: number;
  created_at: string;
  verified_by: string | null;
}

export interface SchoolOverview {
  school: { id: string; name: string; status: string; registration_no: string; official_email: string; created_at: string; verified_at: string | null; verified_by: string | null };
  people: { owners: number; staff: number; students: number; pending_invites: number };
  tournament: { teams_total: number; teams_by_status: Record<string, number>; participants: number; best_rank?: number | null; next_tournament: null | { id: string; title: string; starts_at: string; venue: string } };
  lms: { students_enrolled: number; enrollments: number; lessons_completed: number; avg_completion_pct: number };
}

export interface SchoolStudentRow {
  student_id: string;
  full_name: string;
  email: string;
  joined_at: string;
  account_status: string;
  team_name: string | null;
  team_status: string | null;
  courses_enrolled: number;
  lessons_completed: number;
  lessons_total: number;
  completion_pct: number;
  last_active: string | null;
}

export interface SchoolCourseRow { course_id: string; title: string; students: number; avg_completion_pct: number }

async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export const fetchSchoolDirectory = () => rpc<SchoolDirectoryRow[]>("school_directory");
export const fetchSchoolOverview = (orgId: string) => rpc<SchoolOverview>("school_overview", { p_org: orgId });
export const fetchSchoolStudents = (orgId: string) => rpc<SchoolStudentRow[]>("school_students", { p_org: orgId });
export const fetchSchoolCourseParticipation = (orgId: string) => rpc<SchoolCourseRow[]>("school_course_participation", { p_org: orgId });
