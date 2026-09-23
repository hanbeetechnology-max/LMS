export type Status = "invited" | "active" | "completed" | "dropped";

export interface Student {
  id: string;
  name: string;
  email: string;
  status: Status;
  enrolledDate: string;
  rollNo: string | null;
  age: number;
  institution: string;
  phone: string;
}

export const SECTIONS = ["Intro to Design — Section B", "Data Structures"];

export const INITIAL_ROSTER: Record<string, Student[]> = {
  "Intro to Design — Section B": [
    { id: "1", name: "Ava Chen", email: "ava@student.edu", status: "active", enrolledDate: "Aug 12", rollNo: "STU-2026-001", age: 20, institution: "Lincoln High School", phone: "(555) 201-4471" },
    { id: "2", name: "Liam Cole", email: "liam@student.edu", status: "active", enrolledDate: "Aug 12", rollNo: "STU-2026-002", age: 21, institution: "Lincoln High School", phone: "(555) 204-8823" },
    { id: "3", name: "Noah Reyes", email: "noah@student.edu", status: "active", enrolledDate: "Aug 14", rollNo: "STU-2026-003", age: 19, institution: "Brookfield College", phone: "(555) 219-3305" },
    { id: "4", name: "Sofia Kim", email: "sofia@student.edu", status: "invited", enrolledDate: "—", rollNo: null, age: 20, institution: "Brookfield College", phone: "(555) 227-9012" },
    { id: "5", name: "Ethan Park", email: "ethan@student.edu", status: "dropped", enrolledDate: "Aug 10", rollNo: "STU-2026-005", age: 22, institution: "Lincoln High School", phone: "(555) 233-6610" },
  ],
  "Data Structures": [
    { id: "6", name: "Priya Nair", email: "priya@student.edu", status: "active", enrolledDate: "Aug 1", rollNo: "STU-2026-006", age: 20, institution: "Brookfield College", phone: "(555) 241-7729" },
    { id: "7", name: "Marcus Webb", email: "marcus@student.edu", status: "completed", enrolledDate: "Jan 5", rollNo: "STU-2026-007", age: 23, institution: "Riverside University", phone: "(555) 258-3391" },
  ],
};

export const STATUS_STYLES: Record<Status, string> = {
  invited: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  active: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  completed: "bg-(--color-cloud) text-(--color-slate)",
  dropped: "bg-(--color-error-soft) text-(--color-error)",
};

export function findStudentById(studentId: string): { student: Student; section: string } | null {
  for (const section of SECTIONS) {
    const student = INITIAL_ROSTER[section].find((s) => s.id === studentId);
    if (student) return { student, section };
  }
  return null;
}
