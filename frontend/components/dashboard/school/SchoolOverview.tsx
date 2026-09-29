"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, GraduationCap, Trophy, Users } from "lucide-react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { fetchMyOrganizationId } from "../../../lib/teamFormationApi";
import { fetchSchoolCourseParticipation, fetchSchoolOverview, type SchoolCourseRow, type SchoolOverview } from "../../../lib/schoolAdminApi";

type OverviewTab = "tournament" | "learning";

export default function SchoolOverviewPage() {
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [courses, setCourses] = useState<SchoolCourseRow[]>([]);
  const [tab, setTab] = useState<OverviewTab>("tournament");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const orgId = await fetchMyOrganizationId();
      if (!orgId) throw new Error("Your account is not linked to an active school.");
      const [summary, participation] = await Promise.all([fetchSchoolOverview(orgId), fetchSchoolCourseParticipation(orgId)]);
      if (!active) return;
      setOverview(summary);
      setCourses(participation);
    }
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load your school overview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <header className={styles.pageHeader}>
        <div className={styles.metricLabel}>SCHOOL PORTAL</div>
        <h1 className={styles.pageTitle}>{overview?.school.name ?? "School Overview"}</h1>
        <p className={styles.pageSubtitle}>Your school's tournament activity and learning progress in one place.</p>
      </header>
      {error && <p role="alert" className={styles.sectionCard}>{error}</p>}
      {loading ? <p role="status">Loading school data…</p> : overview && <>
        <div className={styles.filterGroup} role="tablist" aria-label="School dashboard view" style={{ marginBottom: 22 }}>
          <button type="button" role="tab" aria-selected={tab === "tournament"} className={`${styles.filterBtn} ${tab === "tournament" ? styles.filterBtnActive : ""}`} onClick={() => setTab("tournament")}><Trophy size={16} /> Tournament</button>
          <button type="button" role="tab" aria-selected={tab === "learning"} className={`${styles.filterBtn} ${tab === "learning" ? styles.filterBtnActive : ""}`} onClick={() => setTab("learning")}><BookOpen size={16} /> Learning</button>
        </div>
        {tab === "tournament" ? <>
          <div className={styles.metricsGrid}>
            <Metric icon={<Users size={18} />} title="Active students" value={overview.people.students} detail={`${overview.people.staff + overview.people.owners} school staff`} />
            <Metric icon={<Trophy size={18} />} title="Teams" value={overview.tournament.teams_total} detail={`${overview.tournament.participants} student participants`} />
            <Metric icon={<GraduationCap size={18} />} title="Pending invitations" value={overview.people.pending_invites} detail="Student invitations still open" />
            <Metric icon={<CalendarDays size={18} />} title="Best tournament rank" value={overview.tournament.best_rank ?? "—"} detail="Across your school's results" />
          </div>
          <section className={styles.sectionCard} style={{ marginBottom: 22 }}>
            <div className={styles.sectionHeader}>
              <div><span className={styles.metricLabel}>NEXT EVENT</span><h2 className={styles.sectionTitle} style={{ marginTop: 7 }}>{overview.tournament.next_tournament?.title ?? "No upcoming tournament"}</h2></div>
              <Link href="/dashboard/school/teams" className={styles.actionBtn} style={{ textDecoration: "none" }}>Manage teams <ChevronRight size={16} /></Link>
            </div>
            {overview.tournament.next_tournament ? <div style={{ display: "flex", gap: 20, flexWrap: "wrap", color: "var(--text-muted)" }}><span><CalendarDays size={15} /> {new Date(overview.tournament.next_tournament.starts_at).toLocaleString()}</span>{overview.tournament.next_tournament.venue && <span>{overview.tournament.next_tournament.venue}</span>}</div> : <p style={{ color: "var(--text-muted)" }}>Tournament dates and team rules will show here when an event is announced.</p>}
          </section>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}><div><span className={styles.metricLabel}>TEAM PROGRESS</span><h2 className={styles.sectionTitle} style={{ marginTop: 7 }}>Team applications</h2></div><Link href="/dashboard/school/teams" className={styles.tableTitle}>Open team page →</Link></div>
            <div className={styles.metricsGrid}>{Object.entries(overview.tournament.teams_by_status ?? {}).map(([status, count]) => <Metric key={status} title={status.replaceAll("_", " ")} value={count} detail="teams" />)}{Object.keys(overview.tournament.teams_by_status ?? {}).length === 0 && <p>No teams have been formed yet.</p>}</div>
          </section>
        </> : <>
          <div className={styles.metricsGrid}>
            <Metric icon={<GraduationCap size={18} />} title="Students enrolled" value={overview.lms.students_enrolled} detail="Participating in courses" />
            <Metric icon={<BookOpen size={18} />} title="Active enrollments" value={overview.lms.enrollments} detail="Across all school courses" />
            <Metric icon={<Trophy size={18} />} title="Lessons completed" value={overview.lms.lessons_completed} detail="Combined school progress" />
            <Metric icon={<Users size={18} />} title="Average completion" value={`${overview.lms.avg_completion_pct}%`} detail="For active enrollments" />
          </div>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}><div><span className={styles.metricLabel}>LEARNING ACTIVITY</span><h2 className={styles.sectionTitle} style={{ marginTop: 7 }}>Course participation</h2></div><Link href="/dashboard/school/courses" className={styles.tableTitle}>View courses →</Link></div>
            <div className={styles.tableContainer}><table className={styles.dataTable}><thead><tr><th>Course</th><th>Students</th><th>Average progress</th></tr></thead><tbody>{courses.map((course) => <tr key={course.course_id}><td className={styles.cellHighlight}>{course.title}</td><td>{course.students}</td><td><Progress value={course.avg_completion_pct} /></td></tr>)}{courses.length === 0 && <tr><td colSpan={3}>No school students are enrolled in a course yet.</td></tr>}</tbody></table></div>
          </section>
        </>}
        <nav className={styles.quickActions} aria-label="School quick links" style={{ marginTop: 22 }}>
          <QuickLink href="/dashboard/school/students" title="Student roster" detail="Invite and manage students" />
          <QuickLink href="/dashboard/school/schedule" title="School schedule" detail="View upcoming events" />
          <QuickLink href="/dashboard/school/announcements" title="Announcements" detail="Post a school update" />
        </nav>
      </>}
    </div>
  );
}

function Metric({ icon, title, value, detail }: { icon?: ReactNode; title: string; value: string | number; detail: string }) {
  return <article className={styles.metricCard}><div className={styles.metricCardHeader}><span className={styles.metricLabel}>{title}</span>{icon}</div><div className={styles.metricValue}>{value}</div><p className={styles.metricSubtext}>{detail}</p></article>;
}
function Progress({ value }: { value: number }) { return <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1, height: 7, background: "var(--bg-card-hover)", borderRadius: 8, overflow: "hidden" }}><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: "var(--accent)" }} /></div><span>{value}%</span></div>; }
function QuickLink({ href, title, detail }: { href: string; title: string; detail: string }) { return <Link href={href} className={styles.actionBtn} style={{ textDecoration: "none" }}><span className={styles.actionText}><strong>{title}</strong><span>{detail}</span></span><ChevronRight size={16} /></Link>; }
