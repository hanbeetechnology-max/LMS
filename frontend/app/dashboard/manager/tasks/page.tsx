"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch } from "../../../../lib/supabaseAuth";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";
import { useConfirm } from "../../../../components/ui/useConfirm";

type Task = { id: string; title: string; description: string; priority: "low" | "medium" | "high"; status: "todo" | "in_progress" | "done"; due_date: string | null; staff_id: string; created_at: string };

export default function ManagerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { data: profile, isLoading: profileLoading, error: profileError } = useSessionProfile();
  const managerId = profile?.role === "manager" ? profile.id : "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    const query = new URLSearchParams({ select: "id,title,description,priority,status,due_date,staff_id,created_at", staff_id: `eq.${managerId}`, order: "due_date.asc.nullslast,created_at.desc" });
    const rows = await authenticatedSupabaseFetch<Task[]>(`/rest/v1/staff_tasks?${query.toString()}`);
    setTasks(rows);
  }, [managerId]);

  useEffect(() => {
    if (profileLoading) return;
    if (profileError) { setError(profileError instanceof Error ? profileError.message : "We couldn't load your tasks."); setLoading(false); return; }
    if (!managerId) { setError("Only the manager can view personal manager tasks."); setLoading(false); return; }
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load your tasks."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileLoading, profileError, managerId, load]);

  const { ask, dialog } = useConfirm();

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managerId) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/staff_tasks", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ staff_id: managerId, title: title.trim(), description: description.trim(), due_date: dueDate || null, priority, status: "todo" }) });
      setTitle(""); setDescription(""); setDueDate(""); setPriority("medium"); setMessage("Task added to your list."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't save this task."); }
    finally { setSaving(false); }
  }

  async function updateStatus(task: Task, status: Task["status"]) {
    setSaving(true); setError(""); setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>(`/rest/v1/staff_tasks?id=eq.${encodeURIComponent(task.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
      setMessage(`“${task.title}” updated.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't update this task."); }
    finally { setSaving(false); }
  }

  async function deleteTask(task: Task) {
    if (!(await ask({ title: "Delete this task?", message: `"${task.title}" will be removed. This can't be undone.`, confirmLabel: "Delete", tone: "danger" }))) return;
    setDeletingId(task.id); setError(""); setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>(`/rest/v1/staff_tasks?id=eq.${encodeURIComponent(task.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      setMessage("Task deleted."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't delete this task."); }
    finally { setDeletingId(""); }
  }

  return <div>
    {dialog}
    <div className={styles.pageHeader}><h1 className={styles.pageTitle}>My Tasks</h1><p className={styles.pageSubtitle}>Your priorities and follow-ups</p></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <form className={styles.sectionCard} onSubmit={createTask} style={{ marginBottom: 22 }}>
      <h2 className={styles.sectionTitle}>Add a task</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
        <label>Task<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} /></label>
        <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>Notes<textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} /></label>
      <button type="submit" className={styles.actionBtn} disabled={saving || !managerId} style={{ marginTop: 14 }}>{saving ? "Saving…" : "Add task"}</button>
    </form>
    {loading ? <p role="status">Loading your tasks…</p> : <div style={{ display: "grid", gap: 12 }}>
      {tasks.map((task) => <article key={task.id} className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div><h2 className={styles.sectionTitle}>{task.title}</h2>{task.description && <p style={{ marginTop: 7, color: "var(--text-muted)" }}>{task.description}</p>}<p style={{ marginTop: 8 }}>{task.priority} priority · {task.due_date ? `Due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}` : "No due date"}</p></div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <label>Status<select value={task.status} disabled={saving} onChange={(event) => void updateStatus(task, event.target.value as Task["status"])}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
            <button type="button" className={styles.actionBtn} disabled={deletingId === task.id} onClick={() => void deleteTask(task)}>{deletingId === task.id ? "Deleting…" : "Delete"}</button>
          </div>
        </div>
      </article>)}
      {tasks.length === 0 && <section className={styles.sectionCard}>No tasks yet. Add one above to keep a follow-up on your list.</section>}
    </div>}
  </div>;
}
