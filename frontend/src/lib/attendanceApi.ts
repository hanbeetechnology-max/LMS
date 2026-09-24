import { supabase } from "./supabaseClient";
import type { Status } from "./rosterApi";

// Manual, per-session attendance marking on top of `class_sessions`/
// `attendance_marks` (supabase/migrations/0001_init.sql, 0002_rls.sql) —
// replaces StaffAttendancePage.tsx's local marksBySection/notesBySection
// state once a page is wired to it. Not yet wired into any page.

export interface ClassSessionMeta {
  id: string;
  scheduledAt: string;
}

/** Readable by all signed-in users per RLS ("class sessions readable by all
 *  signed in"); filtered to one section here since that's how the staff
 *  attendance UI picks a session to mark. */
export async function fetchClassSessions(sectionId: string): Promise<ClassSessionMeta[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, scheduled_at")
    .eq("section_id", sectionId)
    .order("scheduled_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, scheduledAt: row.scheduled_at }));
}

/** A student's own marks are visible per RLS ("a student sees their own
 *  attendance marks; staff/manager see all"), so this naturally scopes down
 *  for a non-staff caller — it just won't return other students' rows. */
export async function fetchAttendanceForSession(
  classSessionId: string,
): Promise<Record<string, { status: Status; note: string }>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("attendance_marks")
    .select("enrollment_id, status, note")
    .eq("class_session_id", classSessionId);
  if (error || !data) return {};
  const result: Record<string, { status: Status; note: string }> = {};
  for (const row of data) {
    // attendance_status ('present'/'absent'/'late'/'excused') is a subset of
    // the roster Status union — safe to widen directly.
    result[row.enrollment_id] = { status: row.status as Status, note: row.note };
  }
  return result;
}

/** Staff/manager-only per RLS ("staff/manager mark attendance"). Upserts on
 *  the table's `unique (class_session_id, enrollment_id)` constraint so
 *  re-saving a session overwrites existing marks instead of duplicating
 *  them. `markedBy` is the acting staff/manager's profile id, required by
 *  the `marked_by` not-null column. */
export async function saveAttendanceMarks(
  classSessionId: string,
  marks: Array<{ enrollmentId: string; status: Status; note: string }>,
  markedBy: string,
): Promise<boolean> {
  if (!supabase) return false;
  const rows = marks.map((mark) => ({
    class_session_id: classSessionId,
    enrollment_id: mark.enrollmentId,
    status: mark.status,
    note: mark.note,
    marked_by: markedBy,
  }));
  const { error } = await supabase
    .from("attendance_marks")
    .upsert(rows, { onConflict: "class_session_id,enrollment_id" });
  return !error;
}
