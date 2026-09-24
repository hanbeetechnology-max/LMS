import { supabase } from "./supabaseClient";

// Real holidays access, on top of `holidays` (supabase/migrations/
// 0001_init.sql, 0002_rls.sql) — replaces mockHolidays.ts's INITIAL_HOLIDAYS
// once ManagerHolidaysPage.tsx is wired to it. Not yet wired into any page
// (see docs/PLAN.md); this is the data-access layer only.

export type HolidayScope = "staff" | "students" | "center";

export interface HolidayRow {
  id: string;
  name: string;
  date: string; // ISO "YYYY-MM-DD"
  scope: HolidayScope;
}

interface HolidayDbRow {
  id: string;
  name: string;
  holiday_date: string;
  scope: HolidayScope;
}

/** Readable by all signed-in users per RLS ("holidays readable by all signed
 *  in"). */
export async function fetchHolidays(): Promise<HolidayRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("holidays")
    .select("id, name, holiday_date, scope")
    .order("holiday_date", { ascending: true });
  if (error || !data) return [];
  return (data as HolidayDbRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    date: row.holiday_date,
    scope: row.scope,
  }));
}

/** Manager-only per RLS ("manager manages holidays"). */
export async function createHoliday(name: string, date: string, scope: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("holidays")
    .insert({ name, holiday_date: date, scope })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** Manager-only per RLS ("manager deletes holidays"). */
export async function deleteHoliday(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  return !error;
}
