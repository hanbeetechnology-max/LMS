export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceEntry {
  session: string;
  status: AttendanceStatus;
}

export interface StudentRecord {
  attendanceHistory: AttendanceEntry[];
  completedLessonIds: string[];
  notes: string;
}

/**
 * Keyed by the same student ids already used consistently across
 * StaffRosterPage.tsx and StaffAttendancePage.tsx (e.g. "1" = Ava Chen in
 * both). Single source of truth for per-student attendance/progress mock
 * data so Roster and the Student Profile page don't each invent their own.
 */
export const STUDENT_RECORDS: Record<string, StudentRecord> = {
  "1": {
    // Ava Chen — Intro to Design — Section B
    attendanceHistory: [
      { session: "Fri, Sep 12 · 10:00 AM", status: "present" },
      { session: "Wed, Sep 3 · 10:00 AM", status: "present" },
    ],
    completedLessonIds: ["l1", "l2"],
    notes: "",
  },
  "2": {
    // Liam Cole — Intro to Design — Section B
    attendanceHistory: [
      { session: "Fri, Sep 12 · 10:00 AM", status: "present" },
      { session: "Wed, Sep 3 · 10:00 AM", status: "late" },
    ],
    completedLessonIds: ["l1"],
    notes: "",
  },
  "3": {
    // Noah Reyes — Intro to Design — Section B
    attendanceHistory: [
      { session: "Fri, Sep 12 · 10:00 AM", status: "absent" },
      { session: "Wed, Sep 3 · 10:00 AM", status: "present" },
    ],
    completedLessonIds: [],
    notes: "",
  },
  "4": {
    // Sofia Kim — invited, hasn't joined a session yet
    attendanceHistory: [],
    completedLessonIds: [],
    notes: "",
  },
  "5": {
    // Ethan Park — dropped
    attendanceHistory: [{ session: "Wed, Sep 3 · 10:00 AM", status: "present" }],
    completedLessonIds: ["l1"],
    notes: "Requested to drop the section — see email from Aug 20.",
  },
  "6": {
    // Priya Nair — Data Structures
    attendanceHistory: [{ session: "Mon, Sep 8 · 1:00 PM", status: "present" }],
    completedLessonIds: [],
    notes: "",
  },
  "7": {
    // Marcus Webb — Data Structures, completed
    attendanceHistory: [{ session: "Mon, Sep 8 · 1:00 PM", status: "present" }],
    completedLessonIds: [],
    notes: "",
  },
};

export function getStudentRecord(studentId: string): StudentRecord {
  return STUDENT_RECORDS[studentId] ?? { attendanceHistory: [], completedLessonIds: [], notes: "" };
}

export function attendanceRate(studentId: string): number {
  const { attendanceHistory } = getStudentRecord(studentId);
  if (attendanceHistory.length === 0) return 0;
  const present = attendanceHistory.filter((a) => a.status === "present").length;
  return Math.round((present / attendanceHistory.length) * 100);
}

/**
 * `totalLessons` is passed in rather than looked up here because only one
 * course ("Intro to Design — Section B", 5 lessons — see
 * StaffCourseEditorPage's INITIAL_MODULES / StaffStudentProfilePage's
 * INTRO_TO_DESIGN_LESSONS) has authored lesson content in the mock data;
 * callers for other sections should pass 0 and render an honest "—" instead.
 */
export function completionRate(studentId: string, totalLessons: number): number {
  if (totalLessons === 0) return 0;
  const { completedLessonIds } = getStudentRecord(studentId);
  return Math.round((completedLessonIds.length / totalLessons) * 100);
}
