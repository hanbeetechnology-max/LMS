import { supabase } from "./supabaseClient";

// Real roster access, on top of `sections`/`enrollments` (supabase/migrations/
// 0001_init.sql, 0002_rls.sql) — replaces mockStaffRoster.ts's INITIAL_ROSTER
// once a page is wired to it. Not yet wired into any page (see docs/PLAN.md);
// this is the data-access layer only.

export type Status = "invited" | "active" | "completed" | "dropped";

export interface RosterStudent {
  id: string; // enrollment id
  studentId: string; // profiles.id
  name: string;
  email: string;
  status: Status;
  enrolledDate: string;
  rollNo: string | null;
  age: number | null;
  institution: string | null;
  phone: string | null;
}

export interface SectionMeta {
  id: string;
  name: string;
  courseTitle: string;
  capacity: number;
  startDate: string;
  endDate: string;
}

interface EnrollmentRow {
  id: string;
  status: Status;
  roll_no: string | null;
  age: number | null;
  institution: string | null;
  phone: string | null;
  enrolled_date: string;
  student_id: string;
  profiles: { id: string; full_name: string; email: string } | null;
}

/** Staff/manager sees every enrollment (optionally filtered to one section);
 *  a student would only ever get their own row back per RLS, so this is
 *  effectively staff/manager-only in practice. Joins `enrollments` with
 *  `profiles` for the student's name/email, since enrollments itself only
 *  stores `student_id`. */
export async function fetchRoster(sectionId?: string): Promise<RosterStudent[]> {
  if (!supabase) return [];
  let query = supabase
    .from("enrollments")
    .select("id, status, roll_no, age, institution, phone, enrolled_date, student_id, profiles(id, full_name, email)")
    .order("enrolled_date", { ascending: true });
  if (sectionId) query = query.eq("section_id", sectionId);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as EnrollmentRow[]).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    name: row.profiles?.full_name ?? "Unknown student",
    email: row.profiles?.email ?? "",
    status: row.status,
    enrolledDate: row.enrolled_date,
    rollNo: row.roll_no,
    age: row.age,
    institution: row.institution,
    phone: row.phone,
  }));
}

interface SectionRow {
  id: string;
  name: string;
  capacity: number;
  start_date: string;
  end_date: string;
  courses: { title: string } | null;
}

/** Readable by all signed-in users (sections themselves aren't gated by
 *  role); joins `courses` for the display title. */
export async function fetchSections(): Promise<SectionMeta[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sections")
    .select("id, name, capacity, start_date, end_date, courses(title)")
    .order("start_date", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as SectionRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    courseTitle: row.courses?.title ?? "",
    capacity: row.capacity,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}

/** Staff/manager-only per RLS ("staff/manager manage enrollments"). */
export async function updateEnrollmentStatus(enrollmentId: string, status: Status): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("enrollments").update({ status }).eq("id", enrollmentId);
  return !error;
}

/** Staff/manager-only per RLS — patches the roster-detail fields
 *  (age/institution/phone) that mockStaffRoster.ts's Student interface
 *  carries but that aren't tied to attendance/status changes. */
export async function updateEnrollmentDetails(
  enrollmentId: string,
  patch: { age?: number; institution?: string; phone?: string },
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("enrollments").update(patch).eq("id", enrollmentId);
  return !error;
}
