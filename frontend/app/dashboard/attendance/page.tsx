"use client";

import { Play, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./attendance.module.css";
import { authenticatedSupabaseFetch, getAccountProfile, readStoredSession } from "../../../lib/supabaseAuth";

type AttendanceDay = {
  work_date: string;
  status: "present" | "late" | "absent" | "holiday" | "off" | "today" | "upcoming";
  clock_in: string | null;
  clock_out: string | null;
  hours: number | null;
  on_time: boolean | null;
  holiday_name: string | null;
};

export default function AttendancePage() {
  const [history, setHistory] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [canAttend, setCanAttend] = useState(false);
  const [error, setError] = useState("");
  const [time, setTime] = useState(new Date());

  const loadAttendance = useCallback(async () => {
    const rows = await authenticatedSupabaseFetch<AttendanceDay[]>("/rest/v1/rpc/staff_attendance", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setHistory(rows);
  }, []);

  useEffect(() => {
    let active = true;
    getAccountProfile()
      .then((profile) => {
        if (profile.role !== "staff" && profile.role !== "manager") throw new Error("Attendance is available to Hanbee staff accounts.");
        if (active) setCanAttend(true);
        return loadAttendance();
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load attendance."); })
      .finally(() => { if (active) setLoading(false); });
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [loadAttendance]);

  const today = history.find((row) => row.work_date === new Date().toISOString().slice(0, 10));
  const isClockedIn = Boolean(today?.clock_in && !today.clock_out);
  const formattedTime = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(time);
  }, [time]);

  async function toggleClock() {
    if (!canAttend) return;
    const session = readStoredSession();
    if (!session) { setError("Your session has expired. Sign in again to continue."); return; }
    setBusy(true);
    setError("");
    try {
      if (isClockedIn && today) {
        const query = new URLSearchParams({ staff_id: `eq.${session.user.id}`, work_date: `eq.${today.work_date}`, clock_out: "is.null" });
        await authenticatedSupabaseFetch<unknown>(`/rest/v1/staff_time_entries?${query.toString()}`, {
          method: "PATCH",
          body: JSON.stringify({ clock_out: new Date().toISOString() }),
        });
      } else {
        await authenticatedSupabaseFetch<unknown>("/rest/v1/staff_time_entries", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ staff_id: session.user.id, work_date: new Date().toISOString().slice(0, 10) }),
        });
      }
      await loadAttendance();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update your attendance.");
    } finally {
      setBusy(false);
    }
  }

  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString();
  const formatClock = (value: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Live Attendance</h1>
        <p className={styles.pageSubtitle}>Staff clock-in and attendance history</p>
      </div>

      {!loading && !canAttend && error && <p role="alert">{error}</p>}

      {(loading || canAttend) && (
        <div className={styles.clockPanel}>
          <div className={styles.timeDisplay}>{formattedTime}</div>
          <div className={styles.clockAction}>
            <div className={styles.statusIndicator}>
              <div className={styles.statusDot} style={{ backgroundColor: isClockedIn ? "#00ff80" : "var(--text-muted)", boxShadow: isClockedIn ? "0 0 10px #00ff80" : "none" }} />
              Status: {loading ? "Loading" : isClockedIn ? "Checked In" : "Checked Out"}
            </div>
            <button
              className={styles.clockInBtn}
              onClick={() => void toggleClock()}
              disabled={loading || busy || !canAttend || Boolean(today?.clock_out)}
              style={{ backgroundColor: isClockedIn ? "rgba(255, 68, 68, 0.1)" : "var(--bg-card)", borderColor: isClockedIn ? "rgba(255, 68, 68, 0.3)" : "var(--border-subtle)", color: isClockedIn ? "#ff4444" : "var(--text-main)" }}
            >
              {busy ? "SAVING…" : isClockedIn ? <><Square size={20} fill="currentColor" /> CLOCK OUT</> : <><Play size={20} fill="currentColor" /> CLOCK IN</>}
            </button>
          </div>
        </div>
      )}
      {canAttend && error && <p role="alert" style={{ marginTop: 16 }}>{error}</p>}

      {canAttend && <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Attendance History</h2>
        {loading ? <p role="status">Loading attendance…</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Date</th><th>Check-In</th><th>Check-Out</th><th>Total Hours</th><th>Status</th></tr></thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.work_date}>
                  <td>{formatDate(row.work_date)}</td>
                  <td style={{ fontFamily: "monospace" }}>{formatClock(row.clock_in)}</td>
                  <td style={{ fontFamily: "monospace" }}>{formatClock(row.clock_out)}</td>
                  <td style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{row.hours == null ? "—" : `${row.hours}h`}</td>
                  <td><span className={`${styles.badge} ${row.status === "present" ? styles.badgePresent : row.status === "late" ? styles.badgeLate : styles.badgeNoPitDuty}`}>{row.holiday_name ? `${row.status.toUpperCase()} · ${row.holiday_name}` : row.status.toUpperCase()}</span></td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={5}>No attendance records are available.</td></tr>}
            </tbody>
          </table>
        )}
      </div>}
    </div>
  );
}
