import { useEffect } from "react";
import type { HanbeeStaffOverviewRow } from "../../lib/portalApi";
import { fetchAllTasksForManager, type TaskPriority, type TaskStatus } from "../../lib/staffTasksApi";
import { Badge, Card, ErrorBlock, LoadingBlock, formatDate, useAsync, type BadgeTone } from "../kit";
import { AttendanceView } from "../hanbee/AttendanceView";
import { btn } from "../hanbee/ui";

const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = { high: "bad", medium: "warn", low: "neutral" };
const GROUPS: [TaskStatus, string][] = [["todo", "To do"], ["in_progress", "In progress"], ["done", "Done"]];

function Tasks({ staffId }: { staffId: string }) {
  const { data, loading, error, reload } = useAsync(async () => (await fetchAllTasksForManager()).filter((t) => t.staffId === staffId), [staffId]);
  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock onRetry={reload} />;
  if (data.length === 0) return <p className="text-sm text-(--color-slate)">No tasks.</p>;
  return (
    <div className="space-y-4">
      {GROUPS.map(([status, label]) => {
        const items = data.filter((t) => t.status === status);
        if (items.length === 0) return null;
        return (
          <div key={status}>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">{label} ({items.length})</p>
            <ul className="mt-2 divide-y divide-(--color-line)">
              {items.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 break-words text-(--color-ink)">{t.title}</span>
                  {t.dueDate && <span className="text-xs text-(--color-slate)">{formatDate(t.dueDate)}</span>}
                  <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Right-side view-only panel. */
export function PerformancePanel({ row, onClose }: { row: HanbeeStaffOverviewRow; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Performance" onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-3xl overflow-y-auto bg-(--color-canvas) p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-(--color-ink)">Performance</h2>
            <p className="text-sm text-(--color-slate)">{row.fullName} ({row.email}), view only</p>
          </div>
          <button type="button" autoFocus className={btn.secondary} onClick={onClose}>Close</button>
        </div>
        <AttendanceView staffId={row.staffId} />
        <Card className="mt-6">
          <h3 className="mb-3 text-base font-semibold text-(--color-ink)">Tasks</h3>
          <Tasks staffId={row.staffId} />
        </Card>
      </aside>
    </div>
  );
}
