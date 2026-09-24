import { supabase } from "./supabaseClient";

// Real staff time-tracking access, on top of `staff_time_entries` (supabase/
// migrations/0001_init.sql, 0002_rls.sql) — replaces mockStaffTimeTracking.ts's
// WEEK_HISTORY/TWO_WEEK_HISTORY once a page (TimeClockWidget,
// StaffPerformancePage) is wired to it. Not yet wired into any page (see
// docs/PLAN.md); this is the data-access layer only.

export interface TimeEntryRow {
  id: string;
  staffId: string;
  staffName: string | null;
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  onTime: boolean;
}

interface TimeEntryDbRow {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  on_time: boolean;
  profiles: { full_name: string } | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** RLS ("a staff member writes only their own time entries") requires
 *  staff_id = auth.uid(). Inserts today's row only if one doesn't already
 *  exist (the `unique (staff_id, work_date)` constraint would otherwise
 *  reject a second clock-in the same day). `on_time` doesn't have an
 *  established "late" cutoff anywhere in the mock data (WEEK_HISTORY just
 *  carries it as a seeded flag, no rule derives it) — defaulting to `true`
 *  here rather than guessing a threshold; a real "late after 9:15am" rule
 *  can be layered on by whoever wires this in. */
export async function clockIn(): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  const staffId = userData?.user?.id;
  if (!staffId) return false;
  const workDate = todayIso();
  const { data: existing } = await supabase
    .from("staff_time_entries")
    .select("id")
    .eq("staff_id", staffId)
    .eq("work_date", workDate)
    .maybeSingle();
  if (existing) return true; // already clocked in today
  const { error } = await supabase.from("staff_time_entries").insert({
    staff_id: staffId,
    work_date: workDate,
    clock_in: new Date().toISOString(),
    on_time: true,
  });
  return !error;
}

/** RLS ("a staff member updates only their own time entries"). Updates
 *  today's row's clock_out; no-ops (returns false) if there's no clock-in
 *  yet today. */
export async function clockOut(): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  const staffId = userData?.user?.id;
  if (!staffId) return false;
  const { error, count } = await supabase
    .from("staff_time_entries")
    .update({ clock_out: new Date().toISOString() }, { count: "exact" })
    .eq("staff_id", staffId)
    .eq("work_date", todayIso());
  return !error && (count ?? 0) > 0;
}

/** RLS: "a staff member reads their own time entries; manager reads all" —
 *  for a staff caller this naturally returns only their own rows. */
export async function fetchMyTimeHistory(days = 14): Promise<TimeEntryRow[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData?.user?.id;
  if (!myId) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from("staff_time_entries")
    .select("id, staff_id, work_date, clock_in, clock_out, on_time")
    .eq("staff_id", myId)
    .gte("work_date", since.toISOString().slice(0, 10))
    .order("work_date", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    staffId: row.staff_id,
    staffName: null,
    workDate: row.work_date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    onTime: row.on_time,
  }));
}

/** Manager-only per RLS ("...manager reads all"). Joins `profiles` for the
 *  staff member's name since staff_time_entries only stores staff_id. */
export async function fetchAllTimeEntriesForManager(days = 14): Promise<TimeEntryRow[]> {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from("staff_time_entries")
    .select("id, staff_id, work_date, clock_in, clock_out, on_time, profiles(full_name)")
    .gte("work_date", since.toISOString().slice(0, 10))
    .order("work_date", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as TimeEntryDbRow[]).map((row) => ({
    id: row.id,
    staffId: row.staff_id,
    staffName: row.profiles?.full_name ?? null,
    workDate: row.work_date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    onTime: row.on_time,
  }));
}
