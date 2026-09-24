import { supabase } from "./supabaseClient";

// Real calendar events access, on top of `calendar_events` (supabase/migrations/
// 0013_calendar_events.sql) — replaces CalendarAgenda.tsx's local useState
// over INITIAL_GROUPS once a page is wired to it. Not yet wired into any page
// (see docs/PLAN.md); this is the data-access layer only.

export type CalendarEventType = "class_session" | "office_hours" | "other";

export interface CalendarEventRow {
  id: string;
  title: string;
  eventType: CalendarEventType;
  location: string;
  startsAt: string;
  endsAt: string;
  sectionId: string | null;
}

interface CalendarEventDbRow {
  id: string;
  title: string;
  event_type: CalendarEventType;
  location: string;
  starts_at: string;
  ends_at: string;
  section_id: string | null;
}

/** Readable by all signed-in users per RLS ("calendar events readable by
 *  all signed in"). Returns only upcoming/ongoing events (ends_at >= now),
 *  ordered soonest-first. With `sectionId` given, returns that section's
 *  events plus general events (section_id is null); with no sectionId,
 *  returns every event the caller can see. */
export async function fetchUpcomingEvents(sectionId?: string): Promise<CalendarEventRow[]> {
  if (!supabase) return [];
  let query = supabase
    .from("calendar_events")
    .select("id, title, event_type, location, starts_at, ends_at, section_id")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (sectionId) query = query.or(`section_id.eq.${sectionId},section_id.is.null`);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as CalendarEventDbRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sectionId: row.section_id,
  }));
}

/** Staff/manager-only per RLS ("staff/manager manage calendar events").
 *  `createdBy` isn't part of the input — resolved here from the acting
 *  user's session, same as courseManagementApi.createCourse's owner_id
 *  handling, since `created_by` is not-null with no DB-side default. */
export async function createCalendarEvent(input: {
  title: string;
  eventType: string;
  location: string;
  startsAt: string;
  endsAt: string;
  sectionId?: string;
}): Promise<string | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      title: input.title,
      event_type: input.eventType,
      location: input.location,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      section_id: input.sectionId ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** Staff/manager-only per RLS. */
export async function updateCalendarEvent(
  id: string,
  patch: Partial<{ title: string; eventType: string; location: string; startsAt: string; endsAt: string }>,
): Promise<boolean> {
  if (!supabase) return false;
  const dbPatch: Record<string, string> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.eventType !== undefined) dbPatch.event_type = patch.eventType;
  if (patch.location !== undefined) dbPatch.location = patch.location;
  if (patch.startsAt !== undefined) dbPatch.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) dbPatch.ends_at = patch.endsAt;
  const { error } = await supabase.from("calendar_events").update(dbPatch).eq("id", id);
  return !error;
}

/** Staff/manager-only per RLS. */
export async function deleteCalendarEvent(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Tenant-scoped additions (migration 0028): org_id = a school's event,
// owner_id = a personal event, both null = site-wide. Additive; the functions
// above are unchanged. The database refuses out-of-scope writes and these
// functions throw an Error carrying its message so the page can show it.
// ---------------------------------------------------------------------------

export type CalendarScope = "personal" | "school" | "site";

export interface ScopedCalendarEvent extends CalendarEventRow {
  orgId: string | null;
  ownerId: string | null;
  scope: CalendarScope;
}

interface ScopedDbRow extends CalendarEventDbRow {
  org_id: string | null;
  owner_id: string | null;
}

const SCOPED_COLUMNS = "id, title, event_type, location, starts_at, ends_at, section_id, org_id, owner_id";

function toScoped(row: ScopedDbRow): ScopedCalendarEvent {
  return {
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sectionId: row.section_id,
    orgId: row.org_id,
    ownerId: row.owner_id,
    scope: row.owner_id ? "personal" : row.org_id ? "school" : "site",
  };
}

/** Events that overlap [fromIso, toIso), with scope columns. RLS decides what the caller sees. */
export async function fetchEventsInRange(fromIso: string, toIso: string): Promise<ScopedCalendarEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("calendar_events")
    .select(SCOPED_COLUMNS)
    .lt("starts_at", toIso)
    .gte("ends_at", fromIso)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ScopedDbRow[]).map(toScoped);
}

/** `school` uses `orgId` (the caller's school); `personal` sets owner to the caller. Throws on refusal. */
export async function createScopedEvent(input: {
  title: string;
  eventType: CalendarEventType;
  location: string;
  startsAt: string;
  endsAt: string;
  scope: CalendarScope;
  orgId?: string | null;
}): Promise<string> {
  if (!supabase) throw new Error("Not connected.");
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("You are signed out. Sign in again.");
  if (input.scope === "school" && !input.orgId) throw new Error("You are not linked to a school.");
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      title: input.title,
      event_type: input.eventType,
      location: input.location,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      created_by: userId,
      owner_id: input.scope === "personal" ? userId : null,
      org_id: input.scope === "school" ? input.orgId : null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the event.");
  return data.id;
}

/** Throws on refusal. Scope and owner can not change after creation. */
export async function updateScopedEvent(
  id: string,
  patch: Partial<{ title: string; eventType: CalendarEventType; location: string; startsAt: string; endsAt: string }>,
): Promise<void> {
  if (!supabase) throw new Error("Not connected.");
  const dbPatch: Record<string, string> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.eventType !== undefined) dbPatch.event_type = patch.eventType;
  if (patch.location !== undefined) dbPatch.location = patch.location;
  if (patch.startsAt !== undefined) dbPatch.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) dbPatch.ends_at = patch.endsAt;
  const { data, error } = await supabase.from("calendar_events").update(dbPatch).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("You are not allowed to change this event.");
}

/** Throws on refusal (including when the database silently matched no row). */
export async function deleteScopedEvent(id: string): Promise<void> {
  if (!supabase) throw new Error("Not connected.");
  const { data, error } = await supabase.from("calendar_events").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("You are not allowed to delete this event.");
}
