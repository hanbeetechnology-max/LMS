import { useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import {
  createTask,
  deleteTask,
  fetchAllTasksForManager,
  fetchMyTasks,
  setTaskStatus,
  updateTask,
  type TaskPriority,
  type TaskRow,
  type TaskStatus,
} from "../../lib/staffTasksApi";
import { useToast } from "../../lib/ToastProvider";
import { ErrorBlock, LoadingBlock, formatDate, useAsync } from "../kit";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];
const PRIORITY_LABEL: Record<TaskPriority, string> = { low: "Low", medium: "Medium", high: "High" };
const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

const inputClass =
  "min-h-11 w-full rounded-lg border border-(--color-line) bg-(--color-card) px-3 text-sm text-(--color-ink) outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40";
const accentBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-(--color-accent) px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)";
const ghostBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-card) px-3 text-sm font-medium text-(--color-ink-soft) hover:border-(--color-ink) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function compareTasks(a: TaskRow, b: TaskRow) {
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return compareDue(a, b);
}
function compareDue(a: TaskRow, b: TaskRow) {
  if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

function PriorityBadge({ p }: { p: TaskPriority }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASS[p]}`}>{PRIORITY_LABEL[p]}</span>;
}

function DueChip({ t }: { t: TaskRow }) {
  if (!t.dueDate) return null;
  const overdue = t.status !== "done" && t.dueDate < todayIso();
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${overdue ? "bg-red-100 font-medium text-red-700" : "bg-gray-100 text-gray-700"}`}>
      {overdue ? "Overdue " : ""}
      {formatDate(t.dueDate)}
    </span>
  );
}

interface FormState {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due: string;
}

function TaskDialog({ initial, onSave, onClose }: { initial: TaskRow | null; onSave: (f: FormState) => Promise<void>; onClose: () => void }) {
  const [f, setF] = useState<FormState>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    priority: initial?.priority ?? "medium",
    status: initial?.status ?? "todo",
    due: initial?.dueDate ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const label = "mb-1 block text-sm font-medium text-(--color-ink)";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-h"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-(--color-line) bg-(--color-card) p-5 shadow-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.title.trim()) return;
          setBusy(true);
          await onSave(f);
          setBusy(false);
        }}
      >
        <h2 id="task-dialog-h" className="mb-4 text-lg font-semibold text-(--color-ink)">
          {initial ? "Edit task" : "New task"}
        </h2>
        <div className="grid gap-3">
          <div>
            <label htmlFor="tk-title" className={label}>
              Title
            </label>
            <input id="tk-title" required maxLength={200} className={inputClass} value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus />
          </div>
          <div>
            <label htmlFor="tk-desc" className={label}>
              Description
            </label>
            <textarea id="tk-desc" rows={3} className={`${inputClass} py-2`} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tk-priority" className={label}>
                Priority
              </label>
              <select id="tk-priority" className={inputClass} value={f.priority} onChange={(e) => set("priority", e.target.value as TaskPriority)}>
                {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tk-status" className={label}>
                Status
              </label>
              <select id="tk-status" className={inputClass} value={f.status} onChange={(e) => set("status", e.target.value as TaskStatus)}>
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="tk-due" className={label}>
              Due date
            </label>
            <input id="tk-due" type="date" className={inputClass} value={f.due} onChange={(e) => set("due", e.target.value)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={accentBtn} disabled={busy || !f.title.trim()}>
            {initial ? "Save task" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface Actions {
  move: (t: TaskRow, s: TaskStatus) => void;
  edit: (t: TaskRow) => void;
  remove: (t: TaskRow) => void;
}

function Board({ tasks, actions, showOwner }: { tasks: TaskRow[]; actions: Actions | null; showOwner?: boolean }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[52rem] grid-cols-3 gap-4 lg:min-w-0">
        {COLUMNS.map((c) => {
          const items = tasks.filter((t) => t.status === c.key).sort(compareTasks);
          return (
            <section key={c.key} aria-label={c.label} data-testid={`col-${c.key}`} className="min-w-0">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-slate)">{c.label}</h2>
                <span className="text-xs text-(--color-slate)" aria-label={`${items.length} tasks`}>
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-(--color-line) p-4 text-center text-sm text-(--color-slate)">No tasks here</p>
              ) : (
                <ul className="grid gap-3">
                  {items.map((t) => (
                    <li key={t.id} data-testid="task-card" className="rounded-xl border border-(--color-line) bg-(--color-card) p-3">
                      <p className={`text-sm font-medium ${t.status === "done" ? "text-(--color-slate) line-through" : "text-(--color-ink)"}`}>{t.title}</p>
                      {t.description && <p className="mt-1 line-clamp-2 text-xs text-(--color-slate)">{t.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <PriorityBadge p={t.priority} />
                        <DueChip t={t} />
                        {showOwner && t.staffName && <span className="text-xs text-(--color-slate)">{t.staffName}</span>}
                      </div>
                      {actions && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-(--color-line) pt-2">
                          {COLUMNS.filter((o) => o.key !== t.status).map((o) => (
                            <button key={o.key} type="button" className={`${ghostBtn} text-xs`} aria-label={`Move "${t.title}" to ${o.label}`} onClick={() => actions.move(t, o.key)}>
                              Move to {o.label}
                            </button>
                          ))}
                          <button type="button" className={`${ghostBtn} text-xs`} aria-label={`Edit "${t.title}"`} onClick={() => actions.edit(t)}>
                            Edit
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

type SortKey = "priority" | "due";

function ListView({ tasks, actions, showOwner }: { tasks: TaskRow[]; actions: Actions | null; showOwner?: boolean }) {
  const [sort, setSort] = useState<SortKey>("priority");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const rows = [...tasks].sort(sort === "priority" ? compareTasks : compareDue);
  if (rows.length === 0) return <p className="rounded-xl border border-dashed border-(--color-line) p-6 text-center text-sm text-(--color-slate)">No tasks here</p>;
  const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-(--color-slate)";
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-line) bg-(--color-card)">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="border-b border-(--color-line)">
          <tr>
            <th className={th}>Title</th>
            {showOwner && <th className={th}>Person</th>}
            <th className={th} aria-sort={sort === "priority" ? "ascending" : "none"}>
              <button type="button" className="min-h-11 font-semibold uppercase" onClick={() => setSort("priority")}>
                Priority{sort === "priority" ? " ↓" : ""}
              </button>
            </th>
            <th className={th}>Status</th>
            <th className={th} aria-sort={sort === "due" ? "ascending" : "none"}>
              <button type="button" className="min-h-11 font-semibold uppercase" onClick={() => setSort("due")}>
                Due{sort === "due" ? " ↑" : ""}
              </button>
            </th>
            {actions && <th className={th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} data-testid="task-row" className="border-b border-(--color-line) last:border-0">
              <td className="px-3 py-2">
                <span className={t.status === "done" ? "text-(--color-slate) line-through" : "text-(--color-ink)"}>{t.title}</span>
              </td>
              {showOwner && <td className="px-3 py-2 text-(--color-slate)">{t.staffName ?? "Unknown"}</td>}
              <td className="px-3 py-2">
                <PriorityBadge p={t.priority} />
              </td>
              <td className="px-3 py-2 text-(--color-ink-soft)">{STATUS_LABEL[t.status]}</td>
              <td className="px-3 py-2">{t.dueDate ? <DueChip t={t} /> : <span className="text-(--color-slate)">None</span>}</td>
              {actions && (
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={ghostBtn} aria-label={`Edit "${t.title}"`} onClick={() => actions.edit(t)}>
                      Edit
                    </button>
                    {confirmId === t.id ? (
                      <>
                        <button type="button" className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white" onClick={() => { setConfirmId(null); actions.remove(t); }}>
                          Yes, delete
                        </button>
                        <button type="button" className={ghostBtn} onClick={() => setConfirmId(null)}>
                          Keep
                        </button>
                      </>
                    ) : (
                      <button type="button" className={`${ghostBtn} text-red-700`} aria-label={`Delete task "${t.title}"`} onClick={() => setConfirmId(t.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: "list" | "board"; setView: (v: "list" | "board") => void }) {
  const b = (v: "list" | "board", text: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => setView(v)}
      className={`min-h-11 rounded-full px-4 text-sm font-medium ${view === v ? "bg-black text-white" : "text-(--color-ink-soft) hover:text-(--color-ink)"}`}
    >
      {text}
    </button>
  );
  return (
    <div role="group" aria-label="View" className="inline-flex rounded-full border border-(--color-line) bg-(--color-card) p-0.5">
      {b("list", "List")}
      {b("board", "Board")}
    </div>
  );
}

export function TasksPage() {
  const { profile } = useAuth();
  const isManager = profile?.role === "manager";
  const { showToast } = useToast();
  const mine = useAsync(fetchMyTasks, []);
  const all = useAsync(fetchAllTasksForManager, []);
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [view, setView] = useState<"list" | "board">("board");
  const [dialog, setDialog] = useState<{ task: TaskRow | null } | null>(null);
  const [fPerson, setFPerson] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fStatus, setFStatus] = useState("");

  const allTasks = all.data ?? [];
  const people = useMemo(() => {
    const m = new Map<string, string>();
    allTasks.forEach((t) => m.set(t.staffId, t.staffName ?? "Unknown"));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allTasks]);
  const filtered = allTasks.filter((t) => (!fPerson || t.staffId === fPerson) && (!fPriority || t.priority === fPriority) && (!fStatus || t.status === fStatus));

  const actions: Actions = {
    move: async (t, s) => {
      if (!(await setTaskStatus(t.id, s))) return showToast("Could not move the task.", "error");
      mine.reload();
    },
    edit: (t) => setDialog({ task: t }),
    remove: async (t) => {
      if (!(await deleteTask(t.id))) return showToast("Could not delete the task.", "error");
      showToast("Task deleted.");
      mine.reload();
    },
  };

  async function save(f: FormState) {
    const task = dialog?.task ?? null;
    const desc = f.description.trim() || null;
    const ok = task
      ? await updateTask(task.id, { title: f.title.trim(), description: desc, priority: f.priority, status: f.status, dueDate: f.due || null })
      : !!(await createTask(f.title.trim(), { description: desc, priority: f.priority, status: f.status, dueDate: f.due || null }));
    if (!ok) return showToast("Could not save the task.", "error");
    setDialog(null);
    showToast(task ? "Task updated." : "Task added.");
    mine.reload();
  }

  const tabBtn = (k: "mine" | "all", text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === k}
      onClick={() => setTab(k)}
      className={`min-h-11 border-b-2 px-4 text-sm font-medium ${tab === k ? "border-(--color-accent) text-(--color-accent)" : "border-transparent text-(--color-slate) hover:text-(--color-ink)"}`}
    >
      {text}
    </button>
  );

  const state = tab === "mine" ? mine : all;
  const data = tab === "mine" ? (mine.data ?? []) : filtered;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-(--color-ink)">My Tasks</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle view={view} setView={setView} />
          {tab === "mine" && (
            <button type="button" className={accentBtn} onClick={() => setDialog({ task: null })}>
              New task
            </button>
          )}
        </div>
      </div>
      {isManager && (
        <div role="tablist" className="mb-5 flex overflow-x-auto border-b border-(--color-line)">
          {tabBtn("mine", "My tasks")}
          {tabBtn("all", "All employees' tasks")}
        </div>
      )}
      {tab === "all" && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="f-person" className="mb-1 block text-xs text-(--color-slate)">
              Person
            </label>
            <select id="f-person" className={inputClass} value={fPerson} onChange={(e) => setFPerson(e.target.value)}>
              <option value="">Everyone</option>
              {people.map(([id, n]) => (
                <option key={id} value={id}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-priority" className="mb-1 block text-xs text-(--color-slate)">
              Priority
            </label>
            <select id="f-priority" className={inputClass} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
              <option value="">Any priority</option>
              {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-status" className="mb-1 block text-xs text-(--color-slate)">
              Status
            </label>
            <select id="f-status" className={inputClass} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">Any status</option>
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {state.loading && !state.data ? (
        <LoadingBlock />
      ) : state.error ? (
        <ErrorBlock onRetry={state.reload} />
      ) : tab === "mine" && data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-(--color-line) p-8 text-center">
          <p className="font-medium text-(--color-ink)">No tasks yet</p>
          <p className="mt-1 text-sm text-(--color-slate)">Create your first task with the New task button.</p>
        </div>
      ) : view === "board" ? (
        <Board tasks={data} actions={tab === "mine" ? actions : null} showOwner={tab === "all"} />
      ) : (
        <ListView tasks={data} actions={tab === "mine" ? actions : null} showOwner={tab === "all"} />
      )}

      {dialog && <TaskDialog initial={dialog.task} onSave={save} onClose={() => setDialog(null)} />}
    </>
  );
}
