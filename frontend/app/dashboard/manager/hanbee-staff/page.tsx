"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";

type StaffRow = { staff_id: string; full_name: string; email: string; approved: boolean; account_status: string; hours_last_7_days: number; days_worked_last_30: number; late_days_last_30: number; absent_days_last_30: number; open_tasks: number; high_priority_open: number; done_tasks: number; last_clock_in: string | null };
async function rpc<T>(name: string, args: Record<string, unknown>) { return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) }); }

export default function ManagerHanbeeStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "manager") throw new Error("Only the manager can manage Hanbee staff accounts.");
    const rows = await rpc<StaffRow[]>("hanbee_staff_overview");
    setStaff(rows);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load Hanbee staff."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function toggleAccess(row: StaffRow) {
    setBusyId(row.staff_id);
    setError("");
    try {
      if (!row.approved) {
        await authenticatedSupabaseFetch<unknown>(`/rest/v1/profiles?id=eq.${encodeURIComponent(row.staff_id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ approved: true }) });
      } else {
        await rpc("set_account_status", { p_user: row.staff_id, p_status: row.account_status === "active" ? "suspended" : "active", p_reason: "Manager updated staff access" });
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this staff account.");
    } finally { setBusyId(""); }
  }

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Hanbee Staff</h1><p className={styles.pageSubtitle}>Approval, attendance, and task activity</p></div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading staff…</p> : <div className={styles.sectionCard}>
        <div className={styles.tableContainer}><table className={styles.dataTable}>
          <thead><tr><th>Staff member</th><th>Access</th><th>Hours (7d)</th><th>Attendance (30d)</th><th>Tasks</th><th>Last clock-in</th><th>Action</th></tr></thead>
          <tbody>{staff.map((row) => <tr key={row.staff_id}>
            <td>{row.full_name}<br /><small>{row.email}</small></td>
            <td>{row.approved ? row.account_status : "pending approval"}</td>
            <td>{row.hours_last_7_days}</td>
            <td>{row.days_worked_last_30} worked · {row.late_days_last_30} late · {row.absent_days_last_30} absent</td>
            <td>{row.open_tasks} open ({row.high_priority_open} high) · {row.done_tasks} done</td>
            <td>{row.last_clock_in ? new Date(row.last_clock_in).toLocaleString() : "—"}</td>
            <td><button type="button" className={styles.actionBtn} disabled={Boolean(busyId)} onClick={() => void toggleAccess(row)}>{!row.approved ? "Approve" : row.account_status === "active" ? "Suspend" : "Reactivate"}</button></td>
          </tr>)}{staff.length === 0 && <tr><td colSpan={7}>No Hanbee staff accounts found.</td></tr>}</tbody>
        </table></div>
      </div>}
    </div>
  );
}