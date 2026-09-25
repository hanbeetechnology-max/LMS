import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { Link } from "react-router-dom";
import { useToast } from "../../lib/ToastProvider";
import { clockIn, clockOut, fetchMyTimeHistory, type TimeEntryRow } from "../../lib/staffTimeApi";
import { createTask, deleteTask, fetchMyTasks, toggleTaskDone, type TaskRow } from "../../lib/staffTasksApi";
import { fetchSchoolDirectory, fetchSiteLmsOverview, fetchSiteTournamentOverview } from "../../lib/portalApi";
import { Card, StatCard, EmptyState, ErrorBlock, LoadingBlock, PageHeader, formatDate, formatTime, useAsync } from "../kit";
import { btn, inputClass, Field, REFUSED } from "./ui";

function hoursBetween(entry: TimeEntryRow, now: number): number {
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : now;
  return Math.max(0, (end - new Date(entry.clockIn).getTime()) / 3600000);
}

function fmtHours(h: number): string {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

function ClockPanel() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(() => fetchMyTimeHistory(7), []);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const entries = data ?? [];
  const todayEntry = entries.find((e) => e.workDate === today) ?? null;
  const clockedIn = !!todayEntry && !todayEntry.clockOut;
  const doneToday = !!todayEntry && !!todayEntry.clockOut;

  async function toggle() {
    setBusy(true);
    if (clockedIn) {
      const ok = await clockOut();
      showToast(ok ? "Clocked out. Have a good rest of your day." : REFUSED, ok ? "success" : "error");
    } else {
      const ok = await clockIn();
      showToast(ok ? "Clocked in. The server recorded your start time." : REFUSED, ok ? "success" : "error");
    }
    setBusy(false);
    reload();
  }

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock onRetry={reload} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Today</p>
        <p className="mt-2 font-display text-xl font-semibold text-(--color-ink)" data-testid="clock-status">
          {clockedIn ? `Clocked in at ${formatTime(todayEntry!.clockIn)}` : doneToday ? `Clocked out at ${formatTime(todayEntry!.clockOut)}` : "Not clocked in"}
        </p>
        <p className="mt-1 text-sm text-(--color-slate)">Hours so far today: {todayEntry ? fmtHours(hoursBetween(todayEntry, now)) : "0h 00m"}</p>
        {doneToday ? (
          <p className="mt-4 text-sm text-(--color-slate)">You have already clocked out today. See you tomorrow.</p>
        ) : (
          <button type="button" onClick={toggle} disabled={busy} className={`${clockedIn ? btn.secondary : btn.primary} mt-4 min-h-16 w-full text-lg`}>
            {busy ? "Working..." : clockedIn ? "Clock out" : "Clock in"}
          </button>
        )}
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Last 7 days</p>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-(--color-slate)">No time entries yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-(--color-line)">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-(--color-ink)">{formatDate(e.workDate)}</span>
                <span className="text-(--color-slate)">
                  {formatTime(e.clockIn)} to {e.clockOut ? formatTime(e.clockOut) : "still open"}
                </span>
                <span className="font-medium tabular-nums text-(--color-ink)">{fmtHours(hoursBetween(e, now))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TasksPanel() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync<TaskRow[]>(fetchMyTasks, []);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    const id = await createTask(t);
    setBusy(false);
    if (id) {
      setTitle("");
      showToast("Task added.");
      reload();
    } else showToast(REFUSED, "error");
  }

  async function toggle(task: TaskRow) {
    const ok = await toggleTaskDone(task.id, !task.done);
    if (!ok) showToast(REFUSED, "error");
    reload();
  }

  async function remove(task: TaskRow) {
    const ok = await deleteTask(task.id);
    showToast(ok ? "Task deleted." : REFUSED, ok ? "success" : "error");
    reload();
  }

  const tasks = [...(data ?? [])].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-(--color-ink)">My tasks</h2>
      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="New task">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" className={inputClass} />}</Field>
        </div>
        <button type="submit" disabled={busy || !title.trim()} className={btn.primary}>
          Add task
        </button>
      </form>
      <div className="mt-4">
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock onRetry={reload} />
        ) : tasks.length === 0 ? (
          <EmptyState title="No tasks" body="Add one above to keep track of your work." />
        ) : (
          <ul className="divide-y divide-(--color-line)">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} aria-label={`Mark "${t.title}" ${t.done ? "not done" : "done"}`} className="size-5 shrink-0" />
                <span className={`min-w-0 flex-1 break-words text-sm ${t.done ? "text-(--color-mist) line-through" : "text-(--color-ink)"}`}>{t.title}</span>
                <button type="button" onClick={() => remove(t)} aria-label={`Delete task "${t.title}"`} className={`${btn.secondary} px-4`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function AttentionStrip() {
  const { data } = useAsync(async () => {
    const [dir, tour, lms] = await Promise.all([fetchSchoolDirectory(), fetchSiteTournamentOverview(), fetchSiteLmsOverview()]);
    return {
      pendingSchools: dir.filter((s) => s.status === "pending").length,
      teams: tour?.teamsAwaitingDecision ?? 0,
      apps: lms?.courseApplicationsPending ?? 0,
    };
  }, []);
  if (!data) return null;
  const items = [
    { to: "/staff/schools", n: data.pendingSchools, label: "schools waiting for verification" },
    { to: "/staff/tournament", n: data.teams, label: "teams awaiting a decision" },
    { to: "/staff/applications", n: data.apps, label: "course applications pending" },
  ];
  return (
    <section aria-label="Needs your attention" className="mb-6">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Needs your attention</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <Link key={i.to} to={i.to} className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 transition-colors hover:bg-(--color-cloud) ${i.n > 0 ? "border-(--color-amber-deep)/40 bg-(--color-amber-soft)" : "border-(--color-line) bg-(--color-paper)"}`}>
            <span className="font-display text-2xl font-semibold text-(--color-ink)">{i.n}</span>
            <span className="text-sm text-(--color-ink-soft)">{i.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TaskSummary() {
  const { data } = useAsync<TaskRow[]>(fetchMyTasks, []);
  const open = (data ?? []).filter((t) => !t.done);
  const n = (p: string) => open.filter((t) => t.priority === p).length;
  return (
    <section aria-label="Open tasks by priority" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Open tasks" value={open.length} />
      <StatCard label="High priority" value={n("high")} tone={n("high") > 0 ? "bad" : "neutral"} />
      <StatCard label="Medium priority" value={n("medium")} />
      <StatCard label="Low priority" value={n("low")} />
    </section>
  );
}

export function MySpacePage() {
  const { profile } = useAuth();
  const first = (profile?.fullName ?? "").split(" ")[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <>
      <PageHeader title="My space" subtitle={`${greet}${first ? `, ${first}` : ""}. Your day, your hours and what needs a decision.`} />
      <AttentionStrip />
      <TaskSummary />
      <ClockPanel />
      <div className="mt-6">
        <TasksPanel />
      </div>
    </>
  );
}
