"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../../app/dashboard/dashboard.module.css";
import { getAccountProfile } from "../../../lib/supabaseAuth";
import { fetchSchoolDirectory, type SchoolDirectoryRow } from "../../../lib/schoolAdminApi";

export default function SchoolDirectory({ detailPath }: { detailPath: string }) {
  const [schools, setSchools] = useState<SchoolDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const profile = await getAccountProfile();
      if (profile.role !== "manager" && profile.role !== "staff") throw new Error("This school directory is for approved Hanbee staff.");
      const rows = await fetchSchoolDirectory();
      if (active) setSchools(rows);
    }
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the school directory."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Schools</h1><p className={styles.pageSubtitle}>School accounts, membership, and tournament activity</p></div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading schools…</p> : (
        <div className={styles.sectionCard}>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead><tr><th>School</th><th>Status</th><th>Owner</th><th>Students</th><th>Teams</th><th>Actions</th></tr></thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.org_id}>
                    <td className={styles.cellHighlight}>{school.name}</td>
                    <td><span className={`${styles.statusPill} ${school.status === "active" ? styles.statusSuccess : school.status === "pending" ? styles.statusWarning : ""}`}>{school.status}</span></td>
                    <td>{school.owner_name ?? "—"}<br /><small>{school.owner_email}</small></td>
                    <td>{school.students}</td>
                    <td>{school.teams}</td>
                    <td><Link className={styles.actionBtn} href={`${detailPath}?id=${encodeURIComponent(school.org_id)}`}>View details</Link></td>
                  </tr>
                ))}
                {schools.length === 0 && <tr><td colSpan={6}>No schools are registered yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
