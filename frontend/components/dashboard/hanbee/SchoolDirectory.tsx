"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search } from "lucide-react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { Input } from "../../ui/FormField";
import Shimmer from "../../ui/Shimmer";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { fetchSchoolDirectory, fetchSchoolDirectoryCount, type SchoolDirectoryRow } from "../../../lib/schoolAdminApi";

const PAGE_SIZE = 25;

// Debounces a value: only the last change within `delay` ms is returned,
// so typing a search query doesn't fire a network request per keystroke.
function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SchoolDirectory({ detailPath }: { detailPath: string }) {
  const { data: profile } = useSessionProfile();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounced(search);
  const canView = profile?.role === "manager" || profile?.role === "staff";

  const { data: schools, isLoading, isFetching, error } = useQuery({
    queryKey: ["school-directory", debouncedSearch, page],
    queryFn: () => fetchSchoolDirectory(debouncedSearch, PAGE_SIZE, page * PAGE_SIZE),
    enabled: canView,
    placeholderData: (previous) => previous,
  });

  const { data: total } = useQuery({
    queryKey: ["school-directory-count", debouncedSearch],
    queryFn: () => fetchSchoolDirectoryCount(debouncedSearch),
    enabled: canView,
    placeholderData: (previous) => previous,
  });

  const rows: SchoolDirectoryRow[] = schools ?? [];
  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Schools</h1><p className={styles.pageSubtitle}>School accounts, membership, and tournament activity</p></div>
      {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load the school directory."}</p>}

      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder="Search schools by name…"
            aria-label="Search schools"
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {isLoading ? <Shimmer rows={5} /> : (
        <div className={styles.sectionCard}>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead><tr><th>School</th><th>Status</th><th>Owner</th><th>Students</th><th>Teams</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map((school) => (
                  <tr key={school.org_id}>
                    <td className={styles.cellHighlight}>{school.name}</td>
                    <td><span className={`${styles.statusPill} ${school.status === "active" ? styles.statusSuccess : school.status === "pending" ? styles.statusWarning : ""}`}>{school.status}</span></td>
                    <td>{school.owner_name ?? "—"}<br /><small>{school.owner_email}</small></td>
                    <td>{school.students}</td>
                    <td>{school.teams}</td>
                    <td><Link className={styles.actionBtn} href={`${detailPath}?id=${encodeURIComponent(school.org_id)}`}>View details</Link></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6}>{search ? "No schools match your search." : "No schools are registered yet."}</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Page {page + 1} of {totalPages} · {total} school{total === 1 ? "" : "s"}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className={styles.actionBtn} disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
                <button type="button" className={styles.actionBtn} disabled={page + 1 >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
