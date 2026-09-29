import { authenticatedSupabaseFetch, readStoredSession } from "./supabaseAuth";

export interface StudentCertificate {
  id: string;
  serial: string;
  course_title: string;
  issued_at: string;
}

export async function fetchMyCertificates() {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const query = new URLSearchParams({
    select: "id,serial,course_title,issued_at",
    user_id: `eq.${session.user.id}`,
    order: "issued_at.desc",
  });
  return authenticatedSupabaseFetch<StudentCertificate[]>(`/rest/v1/certificates?${query.toString()}`);
}
