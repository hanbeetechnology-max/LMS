import { supabase } from "./supabaseClient";

// Invitations data access (0001_init.sql, 0002_rls.sql, guard in 0018).
// Acceptance happens automatically at signup (handle_new_user); there is no
// accept call. invited_by is forced server-side; only managers may invite
// non-student roles. Not yet wired into any page.

export type InviteRole = "student" | "staff" | "manager";

export interface Invitation {
  id: string;
  email: string;
  role: InviteRole;
  sectionId: string | null;
  invitedBy: string;
  accepted: boolean;
  createdAt: string;
}

interface InvitationRow {
  id: string;
  email: string;
  role: InviteRole;
  section_id: string | null;
  invited_by: string;
  accepted: boolean;
  created_at: string;
}

export async function fetchInvitations(): Promise<Invitation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, section_id, invited_by, accepted, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as InvitationRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    sectionId: r.section_id,
    invitedBy: r.invited_by,
    accepted: r.accepted,
    createdAt: r.created_at,
  }));
}

/** invited_by is overwritten by a DB trigger; the value sent is only to satisfy NOT NULL. */
export async function createInvitation(
  email: string,
  sectionId: string | null,
  role: InviteRole = "student",
): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { error } = await supabase.from("invitations").insert({
    email: email.trim().toLowerCase(),
    role,
    section_id: sectionId,
    invited_by: auth.user.id,
  });
  return !error;
}

export async function deleteInvitation(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  return !error;
}
