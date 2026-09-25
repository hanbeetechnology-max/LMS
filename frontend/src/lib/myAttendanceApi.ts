import { supabase } from "./supabaseClient";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface MyAttendanceRow {
  id: string;
  status: AttendanceStatus;
  note: string;
  markedAt: string;
  /** When the class took place (falls back to when it was marked). */
  sessionAt: string;
  courseTitle: string;
  sectionName: string;
}

interface RawMark {
  id: string;
  status: AttendanceStatus;
  note: string | null;
  marked_at: string;
  class_sessions: {
    scheduled_at: string;
    sections: { name: string; courses: { title: string } | { title: string }[] | null } | { name: string; courses: unknown }[] | null;
  } | null;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** The signed-in student's own attendance marks, newest class first.
 *  Row level security limits attendance_marks to the student's own enrollments. */
export async function fetchMyAttendance(): Promise<MyAttendanceRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("attendance_marks")
    .select("id, status, note, marked_at, class_sessions(scheduled_at, sections(name, courses(title)))");
  if (error) throw error;
  const rows = ((data ?? []) as unknown as RawMark[]).map((r): MyAttendanceRow => {
    const section = one(r.class_sessions?.sections) as { name?: string; courses?: unknown } | null;
    const course = one(section?.courses as { title: string } | { title: string }[] | null);
    return {
      id: r.id,
      status: r.status,
      note: r.note ?? "",
      markedAt: r.marked_at,
      sessionAt: r.class_sessions?.scheduled_at ?? r.marked_at,
      courseTitle: course?.title ?? "Course",
      sectionName: section?.name ?? "",
    };
  });
  return rows.sort((a, b) => new Date(b.sessionAt).getTime() - new Date(a.sessionAt).getTime());
}
