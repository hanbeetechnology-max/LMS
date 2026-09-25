import { supabase } from "./supabaseClient";

export type AttendanceStatus = "present" | "late" | "absent" | "holiday" | "off" | "today" | "upcoming";

export interface AttendanceDay {
  workDate: string;
  status: AttendanceStatus;
  clockIn: string | null;
  clockOut: string | null;
  hours: number;
  onTime: boolean | null;
  holidayName: string | null;
}

export interface WorkSettings {
  startTime: string; // HH:MM
  graceMinutes: number;
  timezone: string;
  workDays: number[]; // ISO 1..7
}

/** staffId null means the caller's own record. */
export async function fetchStaffAttendance(staffId: string | null, from: string, to: string): Promise<AttendanceDay[]> {
  if (!supabase) throw new Error("offline");
  const { data, error } = await supabase.rpc("staff_attendance", { p_staff: staffId, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    workDate: String(r.work_date),
    status: r.status as AttendanceStatus,
    clockIn: (r.clock_in as string | null) ?? null,
    clockOut: (r.clock_out as string | null) ?? null,
    hours: Number(r.hours ?? 0),
    onTime: (r.on_time as boolean | null) ?? null,
    holidayName: (r.holiday_name as string | null) ?? null,
  }));
}

export async function fetchWorkSettings(): Promise<WorkSettings> {
  if (!supabase) throw new Error("offline");
  const { data, error } = await supabase.from("staff_work_settings").select("start_time, grace_minutes, timezone, work_days").eq("id", true).single();
  if (error || !data) throw new Error(error?.message ?? "No settings");
  return {
    startTime: String(data.start_time).slice(0, 5),
    graceMinutes: Number(data.grace_minutes),
    timezone: String(data.timezone),
    workDays: (data.work_days as number[]) ?? [],
  };
}

export async function updateWorkSettings(patch: Partial<Pick<WorkSettings, "startTime" | "graceMinutes" | "workDays">>): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Not connected." };
  const row: Record<string, unknown> = {};
  if (patch.startTime !== undefined) row.start_time = patch.startTime;
  if (patch.graceMinutes !== undefined) row.grace_minutes = patch.graceMinutes;
  if (patch.workDays !== undefined) row.work_days = patch.workDays;
  const { error } = await supabase.from("staff_work_settings").update(row).eq("id", true);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export function workRuleLine(s: WorkSettings): string {
  return `Work starts ${s.startTime}, ${s.graceMinutes} min grace`;
}
