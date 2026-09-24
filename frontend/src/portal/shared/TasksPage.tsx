import { useState } from "react";
import { createTask, deleteTask, fetchMyTasks, toggleTaskDone, updateTask, type TaskRow } from "../../lib/staffTasksApi";
import { useToast } from "../../lib/ToastProvider";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, formatDate, useAsync } from "../kit";

const inputClass =
  "min-h-11 rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-violet) focus-visible:ring-2 focus-visible:ring-(--color-violet)/30";
const primaryBtn =
  "min-h-11 rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper) transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";
const ghostBtn =
  "min-h-11 rounded-full border border-(--color-line) px-4 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The staff_tasks table has no pinned column, so there is no pin/unpin. Open
// tasks are listed first (soonest due date first, undated last), done below.
function byDue(a: TaskRow, b: TaskRow) {
  if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

export function TasksPage() {
  const { showToast } = useToast();
  const tasks = useAsync(fetchMyTasks, []);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function add() {
    if (!title.trim()) return;
    setAdding(true);
    const id = await createTask(title.trim(), due || undefined);
    setAdding(false);
    if (!id) return showToast("Could not add the task. Try again.", "error");
    setTitle("");
    setDue("");
    showToast("Task added.");
    tasks.reload();
  }

  async function toggle(t: TaskRow) {
    if (!(await toggleTaskDone(t.id, !t.done))) return showToast("Could not update the task.", "error");
    tasks.reload();
  }

  async function saveEdit(t: TaskRow) {
    if (!editTitle.trim()) return showToast("A task needs a title.", "error");
    if (!(await updateTask(t.id, { title: editTitle.trim(), dueDate: editDue || null }))) return showToast("Could not save the task.", "error");
    setEditId(null);
    showToast("Task updated.");
    tasks.reload();
  }

  async function remove(t: TaskRow) {
    setConfirmId(null);
    if (!(await deleteTask(t.id))) return showToast("Could not delete the task.", "error");
    showToast("Task deleted.");
    tasks.reload();
  }

  function row(t: TaskRow) {
    const overdue = !t.done && !!t.dueDate && t.dueDate < todayIso();
    if (editId === t.id) {
      return (
        <li key={t.id} className="flex flex-wrap items-end gap-2 rounded-xl border border-(--color-violet) p-3">
          <div className="min-w-48 flex-1">
            <label htmlFor={`t-title-${t.id}`} className="mb-1 block text-xs text-(--color-slate)">
              Task title
            </label>
            <input id={`t-title-${t.id}`} className={`${inputClass} w-full`} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`t-due-${t.id}`} className="mb-1 block text-xs text-(--color-slate)">
              Due date
            </label>
            <input id={`t-due-${t.id}`} type="date" className={inputClass} value={editDue} onChange={(e) => setEditDue(e.target.value)} />
          </div>
          <button type="button" className={primaryBtn} onClick={() => saveEdit(t)}>
            Save
          </button>
          <button type="button" className={ghostBtn} onClick={() => setEditId(null)}>
            Cancel
          </button>
        </li>
      );
    }
    return (
      <li key={t.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${overdue ? "border-(--color-error)/40 bg-(--color-error-soft)" : "border-(--color-line)"}`}>
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => toggle(t)}
          aria-label={`Mark "${t.title}" ${t.done ? "not done" : "done"}`}
          className="h-5 w-5 shrink-0 accent-(--color-violet)"
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${t.done ? "text-(--color-mist) line-through" : "text-(--color-ink)"}`}>{t.title}</p>
          {t.dueDate && (
            <p className="mt-0.5 flex items-center gap-2 text-xs text-(--color-slate)">
              Due {formatDate(t.dueDate)}
              {overdue && <Badge tone="bad">Overdue</Badge>}
            </p>
          )}
        </div>
        <button
          type="button"
          className={ghostBtn}
          onClick={() => {
            setEditId(t.id);
            setEditTitle(t.title);
            setEditDue(t.dueDate ?? "");
          }}
        >
          Edit
        </button>
        {confirmId === t.id ? (
          <>
            <button type="button" className="min-h-11 rounded-full bg-(--color-error) px-4 text-sm font-semibold text-(--color-paper)" onClick={() => remove(t)}>
              Yes, delete
            </button>
            <button type="button" className={ghostBtn} onClick={() => setConfirmId(null)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className={`${ghostBtn} text-(--color-error)`} onClick={() => setConfirmId(t.id)}>
            Delete
          </button>
        )}
      </li>
    );
  }

  const open = (tasks.data ?? []).filter((t) => !t.done).sort(byDue);
  const done = (tasks.data ?? []).filter((t) => t.done).sort(byDue);

  return (
    <>
      <PageHeader title="My tasks" subtitle="Your own to-do list. Only you can see it. Open tasks are listed first, soonest due first." />
      <Card className="mb-6">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <div className="min-w-48 flex-1">
            <label htmlFor="new-task" className="mb-1 block text-sm font-medium text-(--color-ink)">
              New task
            </label>
            <input id="new-task" className={`${inputClass} w-full`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <label htmlFor="new-task-due" className="mb-1 block text-sm font-medium text-(--color-ink)">
              Due date (optional)
            </label>
            <input id="new-task-due" type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <button type="submit" className={primaryBtn} disabled={adding || !title.trim()}>
            Add task
          </button>
        </form>
      </Card>

      {tasks.loading && !tasks.data ? (
        <LoadingBlock />
      ) : tasks.error ? (
        <ErrorBlock onRetry={tasks.reload} />
      ) : (tasks.data ?? []).length === 0 ? (
        <EmptyState title="No tasks yet" body="Add your first task above." />
      ) : (
        <div className="grid gap-6">
          <section aria-labelledby="open-h">
            <h2 id="open-h" className="mb-2 font-display text-lg font-semibold text-(--color-ink)">
              Open ({open.length})
            </h2>
            {open.length === 0 ? <p className="text-sm text-(--color-slate)">Nothing open. Nice.</p> : <ul className="grid gap-2">{open.map(row)}</ul>}
          </section>
          <section aria-labelledby="done-h">
            <h2 id="done-h" className="mb-2 font-display text-lg font-semibold text-(--color-ink)">
              Done ({done.length})
            </h2>
            {done.length === 0 ? <p className="text-sm text-(--color-slate)">Completed tasks show up here.</p> : <ul className="grid gap-2">{done.map(row)}</ul>}
          </section>
        </div>
      )}
    </>
  );
}
