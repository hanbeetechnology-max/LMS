import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSchoolDirectory, type SchoolDirectoryRow } from "../../lib/portalApi";
import { Card, DataTable, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, formatDate, useAsync, type Column } from "../kit";
import { Field, inputClass } from "./ui";
import { SchoolVerifyButtons } from "./SchoolVerifyButtons";

const STATUSES = ["all", "pending", "active", "suspended", "closed"] as const;

export function SchoolsPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(fetchSchoolDirectory, []);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [query, setQuery] = useState("");

  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const filtered = useMemo(
    () => rows.filter((r) => (status === "all" || r.status === status) && r.name.toLowerCase().includes(query.trim().toLowerCase())),
    [rows, status, query],
  );

  const columns: Column<SchoolDirectoryRow>[] = [
    { key: "name", header: "School", sortValue: (r) => r.name.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.name}</span> },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => (r.ownerName ?? "").toLowerCase(),
      render: (r) => (
        <span className="block">
          {r.ownerName ?? "-"}
          <span className="block text-xs text-(--color-mist)">{r.ownerEmail ?? ""}</span>
        </span>
      ),
    },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "students", header: "Students", sortValue: (r) => r.students, render: (r) => r.students },
    { key: "teams", header: "Teams", sortValue: (r) => r.teams, render: (r) => r.teams },
    { key: "participants", header: "Participants", sortValue: (r) => r.participants, render: (r) => r.participants },
    { key: "created", header: "Created", sortValue: (r) => r.createdAt, render: (r) => formatDate(r.createdAt) },
    { key: "by", header: "Verified by", sortValue: (r) => r.verifiedBy ?? "", render: (r) => r.verifiedBy ?? "-" },
  ];

  return (
    <>
      <PageHeader title="Organizations" subtitle="Every school on the platform, with its status and numbers." />
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <>
          {pending.length > 0 && (
            <section aria-label="Needs verification" className="mb-8">
              <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">Needs verification ({pending.length})</h2>
              <div className="grid gap-3">
                {pending.map((s) => (
                  <Card key={s.orgId} className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <button type="button" onClick={() => navigate(`/staff/schools/${s.orgId}`)} className="text-left font-semibold text-(--color-ink) underline-offset-2 hover:underline">
                        {s.name}
                      </button>
                      <p className="text-sm text-(--color-slate)">
                        {s.ownerName ?? "Unknown owner"} {s.ownerEmail ? `(${s.ownerEmail})` : ""} - applied {formatDate(s.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SchoolVerifyButtons orgId={s.orgId} schoolName={s.name} onDone={reload} />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-64">
              <Field label="Search by name">{(id) => <input id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} placeholder="School name" />}</Field>
            </div>
            <div className="w-full sm:w-44">
              <Field label="Status">
                {(id) => (
                  <select id={id} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputClass}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "All statuses" : s}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} rowKey={(r) => r.orgId} onRowClick={(r) => navigate(`/staff/schools/${r.orgId}`)} emptyTitle="No schools match" emptyBody="Try a different search or status." />
        </>
      )}
    </>
  );
}
