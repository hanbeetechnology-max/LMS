import { useMemo, useState } from "react";
import { useToast } from "../../lib/ToastProvider";
import { fetchHanbeeStaffOverview, setAccountStatus, type AccountStatus, type HanbeeStaffOverviewRow } from "../../lib/portalApi";
import { Badge, DataTable, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, relativeTime, useAsync, type Column } from "../kit";
import { ConfirmDialog, actionButton } from "./ConfirmDialog";
import { WorkingHoursCard } from "./WorkingHoursCard";
import { PerformancePanel } from "./PerformancePanel";

const VERBS: Record<AccountStatus, { label: string; title: string; body: string }> = {
  suspended: { label: "Suspend", title: "Suspend", body: "They will not be able to use the portal until reactivated." },
  revoked: { label: "Revoke", title: "Revoke", body: "Their access is removed." },
  active: { label: "Reactivate", title: "Reactivate", body: "They will be able to sign in again." },
};

export function StaffOverviewPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(fetchHanbeeStaffOverview);
  const [pending, setPending] = useState<{ row: HanbeeStaffOverviewRow; to: AccountStatus } | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [attention, setAttention] = useState(false);
  const [viewing, setViewing] = useState<HanbeeStaffOverviewRow | null>(null);
  const rows = useMemo(() => (data ?? []).filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && !r.fullName.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
    return !attention || r.lateDaysLast30 >= 3 || r.absentDaysLast30 >= 2 || r.highPriorityOpen > 0;
  }), [data, query, attention]);

  async function confirm(reason?: string) {
    if (!pending) return;
    setBusy(true);
    const ok = await setAccountStatus(pending.row.staffId, pending.to, reason);
    setBusy(false);
    showToast(ok ? `${pending.row.fullName}: ${VERBS[pending.to].label.toLowerCase()} done` : "That did not go through. Try again.", ok ? "success" : "error");
    setPending(null);
    reload();
  }

  const columns: Column<HanbeeStaffOverviewRow>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (r) => r.fullName.toLowerCase(),
      render: (r) => (
        <div className="min-w-0">
          <button type="button" onClick={() => setViewing(r)} aria-label={`View performance for ${r.fullName}`} className="min-h-11 text-left font-medium text-(--color-ink) underline-offset-2 hover:underline">{r.fullName}</button>
          <div className="-mt-2 text-xs text-(--color-slate)">{r.email}</div>
        </div>
      ),
    },
    { key: "account", header: "Status", sortValue: (r) => r.accountStatus, render: (r) => <StatusBadge status={r.accountStatus} /> },
    { key: "hours", header: "Hours (7d)", sortValue: (r) => r.hoursLast7Days, render: (r) => `${r.hoursLast7Days.toFixed(1)} h` },
    { key: "days", header: "Days worked (30d)", sortValue: (r) => r.daysWorkedLast30, render: (r) => r.daysWorkedLast30 },
    { key: "late", header: "Late days (30d)", sortValue: (r) => r.lateDaysLast30, render: (r) => (r.lateDaysLast30 > 0 ? <Badge tone="warn">{r.lateDaysLast30}</Badge> : 0) },
    { key: "absent", header: "Absent days (30d)", sortValue: (r) => r.absentDaysLast30, render: (r) => (r.absentDaysLast30 > 0 ? <Badge tone="bad">{r.absentDaysLast30}</Badge> : 0) },
    { key: "open", header: "Open tasks", sortValue: (r) => r.openTasks, render: (r) => r.openTasks },
    { key: "high", header: "High priority open", sortValue: (r) => r.highPriorityOpen, render: (r) => (r.highPriorityOpen > 0 ? <Badge tone="bad">{r.highPriorityOpen}</Badge> : 0) },
    { key: "last", header: "Last clock in", sortValue: (r) => r.lastClockIn ?? "", render: (r) => relativeTime(r.lastClockIn) },    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          {r.accountStatus === "active" ? (
            <>
              <button type="button" className={actionButton} onClick={() => setPending({ row: r, to: "suspended" })}>Suspend</button>
              <button type="button" className={actionButton} onClick={() => setPending({ row: r, to: "revoked" })}>Revoke</button>
            </>
          ) : (
            <button type="button" className={actionButton} onClick={() => setPending({ row: r, to: "active" })}>Reactivate</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Hanbee staff" subtitle="Attendance, hours and tasks, view only." />
      <p className="mb-4 text-sm text-(--color-slate)">This screen is read-only apart from account status. You can suspend, revoke or reactivate staff; their work and tasks stay theirs.</p>
      <WorkingHoursCard />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-(--color-slate)">
          Search staff
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" className="min-h-11 w-64 max-w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink)" />
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-(--color-ink)">
          <input type="checkbox" checked={attention} onChange={(e) => setAttention(e.target.checked)} className="size-4" />
          Needs attention (3+ late, 2+ absent or any high priority open)
        </label>
      </div>
      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.staffId} emptyTitle={data && data.length > 0 ? "No staff match" : "No Hanbee staff yet"} />
      )}
      {viewing && <PerformancePanel row={viewing} onClose={() => setViewing(null)} />}
      {pending && (
        <ConfirmDialog
          title={`${VERBS[pending.to].title} ${pending.row.fullName}?`}
          body={VERBS[pending.to].body}
          confirmLabel={VERBS[pending.to].label}
          askReason
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
