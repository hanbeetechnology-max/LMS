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
