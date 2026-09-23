import { type FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { INITIAL_TASKS } from "../../lib/mockStaffTasks";
import { useToast } from "../../lib/ToastProvider";

export function TasksWidget() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [draft, setDraft] = useState("");

  const openCount = tasks.filter((t) => !t.done).length;

  function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (task) showToast(task.done ? `Reopened "${task.title}".` : `Completed "${task.title}".`);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (task) showToast(`Deleted "${task.title}".`);
  }

  function addTask(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setTasks((prev) => [{ id: crypto.randomUUID(), title: draft.trim(), dueDate: "No due date", done: false }, ...prev]);
    setDraft("");
  }

  return (
    <div className="rounded-2xl border border-(--color-line) p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">Tasks</h3>
        <span className="text-xs font-medium text-(--color-mist)">{openCount} open</span>
      </div>

      <form onSubmit={addTask} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 rounded-full border border-(--color-line) bg-(--color-paper) px-3.5 py-1.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded-full bg-(--color-ink) px-3.5 py-1.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
        >
          Add
        </button>
      </form>

      <ul className="mt-3 flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-(--color-cloud)"
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
                className="h-4 w-4 shrink-0 rounded border-(--color-line) accent-(--color-teal)"
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${task.done ? "text-(--color-mist) line-through" : "text-(--color-ink-soft)"}`}>
                  {task.title}
                </p>
                <p className="text-xs text-(--color-mist)">{task.dueDate}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                aria-label={`Delete ${task.title}`}
                className="shrink-0 text-(--color-mist) hover:text-(--color-error)"
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && <p className="py-4 text-center text-sm text-(--color-slate)">No tasks — add one above.</p>}
      </ul>
    </div>
  );
}
