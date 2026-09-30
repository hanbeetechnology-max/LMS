"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, BookOpen, Building2, CircleAlert, Clock3, Flag, Users } from "lucide-react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../lib/supabaseAuth";
import { fetchSchoolDirectory, type SchoolDirectoryRow } from "../../../lib/schoolAdminApi";

type TournamentStats = { tournaments?: Record<string, number>; teams?: Record<string, number>; schools_with_teams?: number; solo_teams?: number; participants?: number; teams_awaiting_decision?: number };
type LmsStats = { courses?: Record<string, number>; students?: number; solo_students?: number; enrollments?: number; avg_completion_pct?: number; course_applications_pending?: number; schools?: Record<string, number> };
type StaffStats = { staff_id: string; full_name: string; approved: boolean; account_status: string; hours_last_7_days: number; days_worked_last_30: number; open_tasks: number; done_tasks: number; last_clock_in: string | null };
async function rpc<T>(name: string) { return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: "{}" }); }

export default function ManagerDashboard() {
  const [tournament, setTournament] = useState<TournamentStats | null>(null);
  const [lms, setLms] = useState<LmsStats | null>(null);
  const [schools, setSchools] = useState<SchoolDirectoryRow[]>([]);
  const [staff, setStaff] = useState<StaffStats[]>([]);
  const [staffApplications, setStaffApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const profile = await getAccountProfile();
      if (profile.role !== "manager") throw new Error("The manager monitor is available to the Hanbee manager.");
      const [tournamentStats, lmsStats, schoolRows, staffRows, pendingStaff] = await Promise.all([
        rpc<TournamentStats>("site_tournament_overview"),
        rpc<LmsStats>("site_lms_overview"),
        fetchSchoolDirectory("", 200, 0), // summary widget: counts only, not a paginated list
        rpc<StaffStats[]>("hanbee_staff_overview"),
        authenticatedSupabaseFetch<Array<{ id: string }>>("/rest/v1/profiles?select=id&role=eq.staff&approved=eq.false&account_status=eq.active"),
      ]);
      if (!active) return;
      setTournament(tournamentStats); setLms(lmsStats); setSchools(schoolRows); setStaff(staffRows); setStaffApplications(pendingStaff.length);
    }
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the manager dashboard."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pendingSchools = schools.filter((school) => school.status === "pending").length;
  const activeCourses = lms?.courses?.published ?? 0;
  const attentionCount = pendingSchools + staffApplications + (lms?.course_applications_pending ?? 0) + (tournament?.teams_awaiting_decision ?? 0);
  const orderedStaff = [...staff].sort((a, b) => (b.last_clock_in ?? "").localeCompare(a.last_clock_in ?? "")).slice(0, 6);

  return <div>
    <header className={styles.pageHeader}><div className={styles.metricLabel}>MANAGER PORTAL</div><h1 className={styles.pageTitle}>Platform monitor</h1><p className={styles.pageSubtitle}>A live view of school activity, learning, tournaments, and Hanbee staff.</p></header>
    {error && <p role="alert" className={styles.sectionCard}>{error}</p>}
    {loading ? <div className={styles.loadingContainer} role="status">Loading platform activity…</div> : <>
      <section className={styles.statusBar} style={{ justifyContent: "space-between" }}>
        <div className={styles.statusItem}><CircleAlert size={18} /><span><strong>{attentionCount} items need your attention</strong><span style={{ display: "block", color: "var(--text-muted)", marginTop: 4 }}>Review applications and tournament entries waiting for a decision.</span></span></div>
        <Link href="/dashboard/manager/verifications" className={styles.actionBtn} style={{ flex: "0 0 auto", textDecoration: "none" }}>Open verification queue <ArrowUpRight size={16} /></Link>
      </section>
      <div className={styles.metricsGrid}>
        <Metric icon={<Building2 size={18} />} label="Registered schools" value={schools.length} caption={`${pendingSchools} waiting for verification`} href="/dashboard/manager/schools" />
        <Metric icon={<Users size={18} />} label="Active students" value={lms?.students ?? 0} caption={`${lms?.solo_students ?? 0} solo accounts`} href="/dashboard/hanbee/lms" />
        <Metric icon={<BookOpen size={18} />} label="Published courses" value={activeCourses} caption={`${lms?.avg_completion_pct ?? 0}% average completion`} href="/dashboard/hanbee/courses" />
        <Metric icon={<Flag size={18} />} label="Tournament participants" value={tournament?.participants ?? 0} caption={`${tournament?.teams_awaiting_decision ?? 0} entries waiting for review`} href="/dashboard/hanbee/tournament" />
      </div>
      <div className={styles.dashboardGrid} style={{ marginTop: 8 }}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}><div><span className={styles.metricLabel}>TEAM ACTIVITY</span><h2 className={styles.sectionTitle} style={{ marginTop: 7 }}>Tournament teams</h2></div><Link href="/dashboard/hanbee/tournament" style={{ color: "var(--text-main)" }}>Review entries →</Link></div>
          <div className={styles.metricsGrid}>{Object.entries(tournament?.teams ?? {}).map(([status, count]) => <div key={status} className={styles.metricCard}><span className={styles.metricLabel}>{status.replaceAll("_", " ")}</span><strong className={styles.metricValue}>{count}</strong></div>)}{Object.keys(tournament?.teams ?? {}).length === 0 && <p>No tournament teams are registered.</p>}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}><span className={styles.badge}>Schools with teams: {tournament?.schools_with_teams ?? 0}</span><span className={styles.badge}>Solo entries: {tournament?.solo_teams ?? 0}</span></div>
        </section>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}><div><span className={styles.metricLabel}>PENDING DECISIONS</span><h2 className={styles.sectionTitle} style={{ marginTop: 7 }}>Needs your attention</h2></div><Bell size={18} /></div>
          <AttentionLink href="/dashboard/manager/verifications" label="School registrations" count={pendingSchools} />
          <AttentionLink href="/dashboard/manager/verifications" label="Hanbee staff applications" count={staffApplications} />
          <AttentionLink href="/dashboard/hanbee/applications" label="Course applications" count={lms?.course_applications_pending ?? 0} />
          <AttentionLink href="/dashboard/hanbee/tournament" label="Tournament entries" count={tournament?.teams_awaiting_decision ?? 0} />
        </section>
      </div>
      <section className={styles.sectionCard} style={{ marginTop: 22 }}>
        <div className={styles.sectionHeader}><div><span className={styles.metricLabel}>STAFF SNAPSHOT</span><h2 className={styles.sectionTitle} style={{ marginTop: 7 }}>Recent work activity</h2></div><Link href="/dashboard/manager/hanbee-staff" style={{ color: "var(--text-main)" }}>View all staff →</Link></div>
        <div className={styles.tableContainer}><table className={styles.dataTable}><thead><tr><th>Staff member</th><th>Hours, last 7 days</th><th>Days worked, last 30</th><th>Open tasks</th><th>Last clock-in</th></tr></thead><tbody>{orderedStaff.map((person) => <tr key={person.staff_id}><td className={styles.cellHighlight}>{person.full_name}</td><td>{person.hours_last_7_days}</td><td>{person.days_worked_last_30}</td><td>{person.open_tasks}</td><td>{person.last_clock_in ? new Date(person.last_clock_in).toLocaleString() : "No clock-in yet"}</td></tr>)}{orderedStaff.length === 0 && <tr><td colSpan={5}>No staff activity is available.</td></tr>}</tbody></table></div>
      </section>
    </>}
  </div>;
}

function Metric({ icon, label, value, caption, href }: { icon: ReactNode; label: string; value: number; caption: string; href: string }) {
  return <Link href={href} className={styles.metricCard} style={{ textDecoration: "none" }}><div className={styles.metricCardHeader}><span className={styles.metricLabel}>{label}</span>{icon}</div><strong className={styles.metricValue}>{value}</strong><span className={styles.metricSubtext}>{caption}</span></Link>;
}
function AttentionLink({ href, label, count }: { href: string; label: string; count: number }) {
  return <Link href={href} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-main)", textDecoration: "none" }}><span>{label}</span><strong>{count}</strong></Link>;
}
