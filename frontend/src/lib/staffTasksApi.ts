import { supabase } from "./supabaseClient";

// Real staff-tasks access, on top of `staff_tasks` (supabase/migrations/
// 0001_init.sql, 0002_rls.sql) — replaces mockStaffTasks.ts's INITIAL_TASKS
// once a page (TasksWidget, StaffPerformancePage) is wired to it. Not yet
// wired into any page (see docs/PLAN.md); this is the data-access layer only.

export interface TaskRow {
  id: string;
  staffId: string;
  staffName: string | null;
  title: string;
  dueDate: string | null;
  done: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  description: string | null;
  createdAt: string | null;
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

const COLS = "id, staff_id, title, due_date, done, priority, status, description, created_at";

function mapRow(row: TaskDbRow): TaskRow {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.profiles?.full_name ?? null,
    title: row.title,
    dueDate: row.due_date,
    done: row.done,
    priority: row.priority ?? "medium",
    status: row.status ?? (row.done ? "done" : "todo"),
    description: row.description ?? null,
    createdAt: row.created_at ?? null,
  };
}

interface TaskDbRow {
  id: string;
  staff_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  priority?: TaskPriority;
  status?: TaskStatus;
  description?: string | null;
  created_at?: string | null;
  profiles: { full_name: string } | null;
}

/** RLS: "a staff member manages their own tasks; manager reads all" — for a
 *  staff caller this naturally returns only their own rows. */
export async function fetchMyTasks(): Promise<TaskRow[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData?.user?.id;
  if (!myId) return [];
  const { data, error } = await supabase
    .from("staff_tasks")
    .select(COLS)
    .eq("staff_id", myId)
    .order("due_date", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as TaskDbRow[]).map((row) => ({ ...mapRow(row), staffName: null }));
}

/** Manager-only per RLS ("...manager reads all") — a non-manager caller
 *  would just get back their own rows (RLS narrows it, doesn't error), so
 *  this is intended to be called from manager-only pages. Joins `profiles`
 *  for the staff member's name since staff_tasks only stores staff_id. */
export async function fetchAllTasksForManager(): Promise<TaskRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("staff_tasks")
    .select(`${COLS}, profiles(full_name)`)
    .order("due_date", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as TaskDbRow[]).map(mapRow);
}

/** RLS ("a staff member writes only their own tasks") requires staff_id =
 *  auth.uid(), resolved here from the acting user's session. */
export async function createTask(
  title: string,
  dueDateOrOptions?: string | { dueDate?: string | null; priority?: TaskPriority; status?: TaskStatus; description?: string | null },
): Promise<string | null> {
  const o = typeof dueDateOrOptions === "string" ? { dueDate: dueDateOrOptions } : (dueDateOrOptions ?? {});
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const staffId = userData?.user?.id;
  if (!staffId) return null;
  const { data, error } = await supabase
    .from("staff_tasks")
    .insert({
      staff_id: staffId,
      title,
      due_date: o.dueDate || null,
      ...(o.priority ? { priority: o.priority } : {}),
      ...(o.status ? { status: o.status } : {}),
      ...(o.description ? { description: o.description } : {}),
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** RLS ("a staff member updates only their own tasks") — a manager cannot
 *  toggle another staff member's task per policy; this is a staff self-serve
 *  action only. */
export async function toggleTaskDone(id: string, done: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("staff_tasks").update({ done }).eq("id", id);
  return !error;
}

/** RLS ("a staff member deletes only their own tasks"). */
export async function deleteTask(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("staff_tasks").delete().eq("id", id);
  return !error;
}

/** Additive: edit a task's title and/or due date (null clears the date). Own tasks only per RLS. */
export async function updateTask(id: string, patch: { title?: string; dueDate?: string | null; priority?: TaskPriority; status?: TaskStatus; description?: string | null }): Promise<boolean> {
  if (!supabase) return false;
  const dbPatch: Record<string, string | null> = {};
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.description !== undefined) dbPatch.description = patch.description ?? "";
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
  const { error } = await supabase.from("staff_tasks").update(dbPatch).eq("id", id);
  return !error;
}

/** Move a task between columns (own tasks only per RLS). */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("staff_tasks").update({ status }).eq("id", id);
  return !error;
}
