import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSchoolDirectory, type SchoolDirectoryRow } from "../../lib/portalApi";
import { DataTable, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, useAsync, type Column } from "../kit";

const FILTERS = ["all", "pending", "active", "suspended", "closed"] as const;

export function ManagerSchoolsPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(fetchSchoolDirectory);
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? [])
      .filter((r) => status === "all" || r.status === status)
      .filter((r) => !needle || `${r.name} ${r.ownerName ?? ""} ${r.ownerEmail ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || a.name.localeCompare(b.name));
  }, [data, status, q]);

  const columns: Column<SchoolDirectoryRow>[] = [
    { key: "name", header: "School", sortValue: (r) => r.name.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.name}</span> },
    { key: "owner", header: "Owner", sortValue: (r) => (r.ownerName ?? "").toLowerCase(), render: (r) => r.ownerName ?? "-" },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "students", header: "Students", sortValue: (r) => r.students, render: (r) => r.students },
    { key: "teams", header: "Teams", sortValue: (r) => r.teams, render: (r) => r.teams },
    { key: "participants", header: "Participants", sortValue: (r) => r.participants, render: (r) => r.participants },
    { key: "verified", header: "Verified by", render: (r) => r.verifiedBy ?? "-" },
  ];

  return (
    <>
      <PageHeader title="Schools" subtitle="Every school on the platform." />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm text-(--color-ink)">
          <span className="sr-only">Search schools</span>
          <input
            type="search"
            placeholder="Search schools or owners"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-h-11 w-full min-w-64 rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm"
          />
        </label>
        <label className="text-sm text-(--color-ink)">
          <span className="sr-only">Filter by status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as (typeof FILTERS)[number])} className="min-h-11 rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm">
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "all" ? "All statuses" : f[0].toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.orgId} onRowClick={(r) => navigate(`/manager/schools/${r.orgId}`)} emptyTitle="No schools match" emptyBody="Try a different search or status." />
      )}
    </>
  );
}
