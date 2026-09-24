import { useState } from "react";
import { useToast } from "../../lib/ToastProvider";
import { fetchHanbeeStaffOverview, setAccountStatus, type AccountStatus, type HanbeeStaffOverviewRow } from "../../lib/portalApi";
import { Badge, DataTable, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, relativeTime, useAsync, type Column } from "../kit";
import { ConfirmDialog, actionButton } from "./ConfirmDialog";

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
    { key: "name", header: "Name", sortValue: (r) => r.fullName.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.fullName}</span> },
    { key: "email", header: "Email", sortValue: (r) => r.email.toLowerCase(), render: (r) => r.email },
    { key: "approval", header: "Approval", sortValue: (r) => Number(r.approved), render: (r) => <Badge tone={r.approved ? "good" : "warn"}>{r.approved ? "approved" : "pending"}</Badge> },
    { key: "account", header: "Account", sortValue: (r) => r.accountStatus, render: (r) => <StatusBadge status={r.accountStatus} /> },
    { key: "hours", header: "Hours (7d)", sortValue: (r) => r.hoursLast7Days, render: (r) => `${r.hoursLast7Days.toFixed(1)} h` },
    { key: "days", header: "Days (30d)", sortValue: (r) => r.daysWorkedLast30, render: (r) => r.daysWorkedLast30 },
    { key: "open", header: "Open tasks", sortValue: (r) => r.openTasks, render: (r) => r.openTasks },
    { key: "done", header: "Done tasks", sortValue: (r) => r.doneTasks, render: (r) => r.doneTasks },
    { key: "last", header: "Last clock in", sortValue: (r) => r.lastClockIn ?? "", render: (r) => relativeTime(r.lastClockIn) },
    {
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
      <PageHeader title="Hanbee staff" subtitle="Hours and tasks, view only." />
      <p className="mb-4 text-sm text-(--color-slate)">This screen is read-only apart from account status. You can suspend, revoke or reactivate staff; their work and tasks stay theirs.</p>
      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.staffId} emptyTitle="No Hanbee staff yet" />
      )}
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
