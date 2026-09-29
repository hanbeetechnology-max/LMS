import { authenticatedSupabaseFetch } from "./supabaseAuth";

export type AnnouncementAudience = "all" | "staff" | "student";

export interface AnnouncementRow {
  id: string;
  org_id: string | null;
  author_id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  pinned: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface AnnouncementAuthor {
  id: string;
  full_name: string;
  role: string;
}

export async function listAnnouncements() {
  return authenticatedSupabaseFetch<AnnouncementRow[]>(
    "/rest/v1/announcements?select=id,org_id,author_id,title,body,audience,pinned,created_at,updated_at&order=pinned.desc,created_at.desc",
  );
}

export async function getAnnouncementAuthors(authorIds: string[]) {
  if (authorIds.length === 0) return [];
  const filter = `in.(${authorIds.map(encodeURIComponent).join(",")})`;
  return authenticatedSupabaseFetch<AnnouncementAuthor[]>(
    `/rest/v1/profiles?select=id,full_name,role&id=${filter}`,
  );
}

export async function createAnnouncement(input: {
  org_id: string | null;
  title: string;
  body: string;
  audience: AnnouncementAudience;
}) {
  return authenticatedSupabaseFetch<undefined>("/rest/v1/announcements", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(input),
  });
}

export async function updateAnnouncement(id: string, input: {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  pinned?: boolean;
}) {
  return authenticatedSupabaseFetch<undefined>(`/rest/v1/announcements?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(input),
  });
}

export async function deleteAnnouncement(id: string) {
  return authenticatedSupabaseFetch<undefined>(`/rest/v1/announcements?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
