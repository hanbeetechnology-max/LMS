import { supabase } from "./supabaseClient";

// Certificates data access (0001_init.sql, 0003_functions.sql, 0018). Issuing
// goes only through the issue_certificate RPC, which verifies completion of
// every published lesson. Not yet wired into any page.

export interface Certificate {
  id: string;
  userId: string;
  courseTitle: string;
  serial: string;
  issuedAt: string;
}

export interface VerifiedCertificate {
  id: string;
  userName: string;
  courseTitle: string;
  issuedAt: string;
  serial: string;
}

export interface StaffCertificate extends Certificate {
  userName: string;
  userEmail: string;
}

interface CertRow {
  id: string;
  user_id: string;
  course_title: string;
  serial: string;
  issued_at: string;
}

const toCert = (r: CertRow): Certificate => ({
  id: r.id,
  userId: r.user_id,
  courseTitle: r.course_title,
  serial: r.serial,
  issuedAt: r.issued_at,
});

export async function fetchMyCertificates(): Promise<Certificate[]> {
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("certificates")
    .select("id, user_id, course_title, serial, issued_at")
    .eq("user_id", auth.user.id)
    .order("issued_at", { ascending: false });
  if (error || !data) return [];
  return (data as CertRow[]).map(toCert);
}

/** Returns null if the RPC refuses (course not found / not enrolled / not fully completed). */
export async function issueCertificate(courseTitle: string): Promise<Certificate | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("issue_certificate", { p_course_title: courseTitle });
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as CertRow | undefined;
  return row && row.id ? toCert(row) : null;
}

/** Public verification via the existing verify_certificate(uuid) RPC (granted to anon).
 *  Takes the certificate id, not the serial: no serial-based RPC exists. */
export async function verifyCertificate(certificateId: string): Promise<VerifiedCertificate | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("verify_certificate", { p_certificate_id: certificateId });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as { id: string; user_name: string; course_title: string; issued_at: string; serial: string };
  return { id: r.id, userName: r.user_name, courseTitle: r.course_title, issuedAt: r.issued_at, serial: r.serial };
}

/** Staff/manager only per RLS (a student would just get their own rows). */
export async function fetchAllCertificatesForStaff(): Promise<StaffCertificate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("certificates")
    .select("id, user_id, course_title, serial, issued_at, profiles(full_name, email)")
    .order("issued_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as (CertRow & { profiles: { full_name: string; email: string } | null })[]).map((r) => ({
    ...toCert(r),
    userName: r.profiles?.full_name ?? "",
    userEmail: r.profiles?.email ?? "",
  }));
}

export interface CertificateOverviewRow {
  certificateId: string;
  serial: string;
  courseTitle: string;
  issuedAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  schoolName: string | null;
}

/** Every certificate the caller may see (manager and Hanbee staff: all, school staff: own school). */
export async function fetchCertificatesOverview(): Promise<CertificateOverviewRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_certificates_overview");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    certificateId: r.certificate_id as string,
    serial: r.serial as string,
    courseTitle: (r.course_title as string) ?? "",
    issuedAt: r.issued_at as string,
    studentId: r.student_id as string,
    studentName: (r.student_name as string) ?? "",
    studentEmail: (r.student_email as string) ?? "",
    schoolName: (r.school_name as string | null) ?? null,
  }));
}

/** Accepts a bare certificate id or a full /verify/<id> link. */
export function extractCertificateId(input: string): string {
  const text = input.trim();
  const m = text.match(/\/verify\/([^/?#\s]+)/);
  return (m ? m[1] : text.split(/[?#\s]/)[0]).trim();
}

export const verifyUrlFor = (certificateId: string) => `${window.location.origin}/verify/${certificateId}`;
