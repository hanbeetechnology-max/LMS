"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { Clock, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../lib/supabaseAuth";

type AttendanceDay = { work_date: string; status: string; clock_in: string | null; clock_out: string | null; hours: number | null };
type StaffTask = { id: string; title: string; priority: string; status: string; due_date: string | null; done: boolean };
interface HanbeeData {
  status: string;
  hoursWorked: { today: number; last7Days: number[]; totalHours: number };
  personalTasks: { id: string; title: string; priority: string; status: string; dueDate: string | null }[];
  needsAttention: { id: string; message: string }[];
}

export default function HanbeeOverview() {
  const [data, setData] = useState<HanbeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "staff" || !profile) throw new Error("My Space is available to approved Hanbee staff.");
    const taskQuery = new URLSearchParams({ select: "id,title,priority,status,due_date,done", staff_id: `eq.${profile.id}`, order: "due_date.asc.nullslast" });
    const [attendance, tasks] = await Promise.all([
      authenticatedSupabaseFetch<AttendanceDay[]>("/rest/v1/rpc/staff_attendance", { method: "POST", body: JSON.stringify({}) }),
      authenticatedSupabaseFetch<StaffTask[]>(`/rest/v1/staff_tasks?${taskQuery.toString()}`),
    ]);
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const today = attendance.find((row) => row.work_date === todayKey);
    const weekAgo = new Date(now);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
    const weekRows = attendance.filter((row) => row.work_date >= weekAgo.toISOString().slice(0, 10) && row.work_date <= todayKey);
    const weeklyHours = weekRows.reduce((sum, row) => sum + (row.hours ?? 0), 0);
    const last7Days = Array.from({ length: 7 }, () => 0);
    for (const row of weekRows) {
      const weekday = new Date(`${row.work_date}T00:00:00`).getDay();
      last7Days[(weekday + 6) % 7] = row.hours ?? 0;
    }
    const mappedTasks = tasks.map((task) => ({ id: task.id, title: task.title, priority: task.priority, status: task.status, dueDate: task.due_date }));
    const attention = tasks.find((task) => !task.done && task.priority === "high") ?? tasks.find((task) => !task.done && task.due_date && task.due_date < todayKey);
    setData({
      status: today?.clock_in && !today.clock_out ? "Clocked In" : "Clocked Out",
      hoursWorked: { today: today?.hours ?? 0, last7Days, totalHours: weeklyHours },
      personalTasks: mappedTasks,
      needsAttention: attention ? [{ id: attention.id, message: attention.title }] : [],
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async (initial: boolean) => {
      if (initial) setLoading(true);
      setError(null);
      try { await fetchData(); }
      catch (reason) { if (mounted) setError(reason instanceof Error ? reason.message : "We couldn't load your Hanbee workspace."); }
      finally { if (mounted && initial) setLoading(false); }
    };
    void load(true);
    const interval = setInterval(() => { void load(false); }, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [fetchData]);
  if (loading) return <div className={styles.loadingContainer}>Loading Hanbee Overview...</div>;
  if (error) return <div className={styles.errorContainer}>{error}</div>;
  if (!data) return <div className={styles.emptyState}>No data available</div>;

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Space</h1>
        <p className={styles.pageSubtitle}>Your personal dashboard and activity overview</p>
      </header>

      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          <Clock size={16} className={styles.statusIcon} />
          <span>
            Status:{' '}
            <strong className={data.status === 'Clocked In' ? styles.statusActive : styles.statusInactive}>
              {data.status}
            </strong>
          </span>
        </div>
        <div className={styles.statusItem}>
          <AlertTriangle size={16} className={styles.statusIcon} />
          <span>
            Needs Attention:{' '}
            <strong>{data.needsAttention.length > 0 ? data.needsAttention[0].message : 'None'}</strong>
          </span>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {/* Time Tracking Card */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <h3 className={styles.metricTitle}>Time Tracking</h3>
            <Clock size={20} className={styles.metricIcon} />
          </div>
          <div className={styles.metricBody}>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Today:</span>
              <span className={styles.metricValue}>{data.hoursWorked.today} hours</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Last 7 Days:</span>
              <span className={styles.metricValue}>{data.hoursWorked.totalHours} hours</span>
            </div>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.min((data.hoursWorked.today / 8) * 100, 100)}%` }}
                ></div>
              </div>
              <small className={styles.progressLabel}>Today's Target: 8 hours</small>
            </div>
          </div>
        </div>

        {/* Personal Tasks Card */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <h3 className={styles.metricTitle}>Personal Tasks</h3>
            <CheckCircle size={20} className={styles.metricIcon} />
          </div>
          <div className={styles.metricBody}>
            {data.personalTasks.length > 0 ? (
              <ul className={styles.taskList}>
                {data.personalTasks.map((task) => (
                  <li key={task.id} className={styles.taskItem}>
                    <div className={styles.taskContent}>
                      <h4 className={styles.taskTitle}>{task.title}</h4>
                      <div className={styles.taskMeta}>
                        <span className={`${styles.statusBadge} ${styles[`priorityBadge${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)}`] || ''}`}>
                          {task.priority}
                        </span>
                        <span className={`${styles.statusBadge} ${task.status === "done" ? styles.statusBadgeCompleted : task.status === "in_progress" ? styles.statusBadgeInProgress : styles.statusBadgePending}`}>
                          {task.status === "done" ? "Completed" : task.status === "in_progress" ? "In Progress" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noTasks}>No personal tasks assigned</p>
            )}
          </div>
        </div>

        {/* Weekly Hours Trend Card */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <h3 className={styles.metricTitle}>Weekly Hours Trend</h3>
            <TrendingUp size={20} className={styles.metricIcon} />
          </div>
          <div className={styles.metricBody}>
            <div className={styles.chartContainer}>
              <div className={styles.chartBarContainer}>
                {data.hoursWorked.last7Days.map((hours, index) => (
                  <div key={index} className={styles.chartBar}>
                    <div
                      className={styles.chartBarFill}
                      style={{ height: `${Math.min((hours / 8) * 100, 100)}%` }}
                    ></div>
                    <small className={styles.chartBarLabel}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                    </small>
                  </div>
                ))}
              </div>
            </div>
            <p className={styles.chartCaption}>Last 7 days (target: 8 hours/day)</p>
          </div>
        </div>
      </div>

      <footer className={styles.pageFooter}>
        <p className={styles.footerText}>
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </footer>
    </div>
  );
}
