import { supabase } from "./supabaseClient";

// Real course-application/inquiry access, on top of `course_applications`
// (supabase/migrations/0001_init.sql, 0002_rls.sql) — this is the real
// backend for the public /apply page's form (ApplyPage.tsx currently just
// `await`s a fake 700ms timeout with a comment saying there's no backend
// yet) and for StaffInquiriesPage.tsx's inbox (currently a hardcoded
// INITIAL_INQUIRIES array). Not yet wired into either page (see
// docs/PLAN.md); this is the data-access layer only.

export interface InquiryRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  courseTitle: string;
  submittedAt: string;
}

interface InquiryDbRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  course_title: string;
  submitted_at: string;
}

/** RLS: "anyone (including anonymous) can submit an application" — works
 *  signed-out, matching the public /apply page having no login. */
export async function submitApplication(input: {
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  courseTitle: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("course_applications").insert({
    full_name: input.fullName,
    email: input.email,
    phone: input.phone ?? "",
    message: input.message ?? "",
    course_title: input.courseTitle,
  });
  return !error;
}

/** Staff/manager-only per RLS ("staff/manager read applications"). */
export async function fetchInquiriesForStaff(): Promise<InquiryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("course_applications")
    .select("id, full_name, email, phone, message, course_title, submitted_at")
    .order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return (data as InquiryDbRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    courseTitle: row.course_title,
    submittedAt: row.submitted_at,
  }));
}
