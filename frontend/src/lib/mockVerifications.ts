export type VerificationStatus = "pending" | "verified" | "declined";

export interface VerificationApplicant {
  id: string;
  name: string;
  email: string;
  course: string;
  age: number;
  institution: string;
  phone: string;
  submittedDate: string;
  status: VerificationStatus;
  rollNo: string | null;
}

// A separate seeded pool from StaffInquiriesPage's applicants — same
// "no shared cross-page store" pattern used throughout this app (see
// docs/PLAN.md §10.20/§10.25). Names are deliberately fresh, not reused
// from the student/instructor/applicant pools already established elsewhere.
export const INITIAL_APPLICANTS: VerificationApplicant[] = [
  {
    id: "1",
    name: "Isabella Cruz",
    email: "isabella.cruz@example.com",
    course: "Intro to Design",
    age: 21,
    institution: "Brookfield College",
    phone: "(555) 301-7742",
    submittedDate: "2 hours ago",
    status: "pending",
    rollNo: null,
  },
  {
    id: "2",
    name: "Jamal Carter",
    email: "jamal.carter@example.com",
    course: "Data Structures",
    age: 19,
    institution: "Lincoln High School",
    phone: "(555) 318-2201",
    submittedDate: "1 day ago",
    status: "pending",
    rollNo: null,
  },
  {
    id: "3",
    name: "Renee Dubois",
    email: "renee.dubois@example.com",
    course: "Intro to Design",
    age: 24,
    institution: "Riverside University",
    phone: "(555) 327-9910",
    submittedDate: "3 days ago",
    status: "verified",
    rollNo: "STU-2026-008",
  },
];

// Continues the highest roll-number sequence already assigned in
// StaffRosterPage.tsx's seeded roster (STU-2026-001..007) plus this page's
// own seeded verified applicant (008) — kept as a local starting point since
// there's no shared store to read the real current max from.
export const STARTING_ROLL_SEQUENCE = 8;
