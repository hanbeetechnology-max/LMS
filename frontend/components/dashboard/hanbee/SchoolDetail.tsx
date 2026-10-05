"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, PauseCircle, PlayCircle, Trophy, Users } from "lucide-react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useConfirm } from "../../ui/useConfirm";
import { fetchSchoolCourseParticipation, fetchSchoolOverview, fetchSchoolStudents, type SchoolCourseRow, type SchoolOverview, type SchoolStudentRow } from "../../../lib/schoolAdminApi";
import { fetchSchoolTeamOverview, fetchUpcomingTournament, type SchoolTeamOverview, type UpcomingTournament } from "../../../lib/teamFormationApi";

type View = "tournament" | "learning";
async function rpc<T>(name: string, args: Record<string, unknown>) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export default function SchoolDetail({ directoryHref = "/dashboard/manager/schools" }: { directoryHref?: string }) {
  const [orgId, setOrgId] = useState("");
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [students, setStudents] = useState<SchoolStudentRow[]>([]);
  const [courses, setCourses] = useState<SchoolCourseRow[]>([]);
  const [teams, setTeams] = useState<SchoolTeamOverview[]>([]);
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [view, setView] = useState<View>("tournament");
  const [busy, setBusy] = useState(false);
  const [busyStudent, setBusyStudent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { data: profile, isLoading: profileLoading, error: profileError } = useSessionProfile();
  const canView = profile?.role === "manager" || profile?.role === "staff";

  const load = useCallback(async () => {
    const selectedOrg = new URLSearchParams(window.location.search).get("id");
    if (!selectedOrg) throw new Error("No school was selected.");
    const [school, people, participation, event] = await Promise.all([
      fetchSchoolOverview(selectedOrg), fetchSchoolStudents(selectedOrg), fetchSchoolCourseParticipation(selectedOrg), fetchUpcomingTournament(),
    ]);
    const teamRows = event ? await fetchSchoolTeamOverview(event.id, selectedOrg) : [];
    setOrgId(selectedOrg);
    setOverview(school);
    setStudents(people);
    setCourses(participation);
    setTournament(event);
    setTeams(teamRows);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (profileError) { setError(profileError instanceof Error ? profileError.message : "We couldn't load this school's details."); setLoading(false); return; }
    if (!canView) { setError("Only approved Hanbee staff can inspect school accounts."); setLoading(false); return; }
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load this school's details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileLoading, profileError, canView, load]);

  const { ask, dialog } = useConfirm();

  async function closeSchool() {
    if (!(await ask({ title: "Close this school?", message: "Close this school permanently? Active memberships will end.", confirmLabel: "Close school", tone: "danger" }))) return;
    await act(() => rpc("set_school_status", { p_org: orgId, p_status: "closed", p_reason: "Closed from school detail" }), "School closed.");
  }

  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The school update was refused."); }
    finally { setBusy(false); }
  }

  async function changeStudent(student: SchoolStudentRow, action: "suspend" | "revoke" | "restore" | "solo") {
    const messages = { suspend: "Suspend this student's account?", revoke: "Revoke this student's access?", restore: "Restore this student's access?", solo: "End this student's school membership and make them a solo student?" };
    if (!(await ask({ title: "Change this student's access?", message: messages[action], confirmLabel: "Continue", tone: action === "revoke" || action === "suspend" ? "danger" : "primary" }))) return;
    setBusyStudent(student.student_id); setError(""); setNotice("");
    try {
      if (action === "solo") {
        await rpc("convert_to_solo", { p_student: student.student_id });
        setNotice(`${student.full_name} is now a solo student.`);
      } else {
        const status = action === "restore" ? "active" : action === "revoke" ? "revoked" : "suspended";
        await rpc("set_account_status", { p_user: student.student_id, p_status: status, p_reason: `School detail action: ${action}` });
        setNotice(`${student.full_name}'s account is ${status}.`);
      }
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't update this student's account."); }
    finally { setBusyStudent(""); }
  }

  if (loading) return <p role="status">Loading school details…</p>;
  if (error && !overview) return <div className={styles.sectionCard} role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); void load().catch((reason) => setError(reason instanceof Error ? reason.message : "We couldn't load this school.")).finally(() => setLoading(false)); }}>Try again</button></div>;
  if (!overview) return null;

  const school = overview.school;
  const closed = school.status === "closed";

  return (
    <div>
      {dialog}
      <header className={styles.pageHeader}>
        <Link href={directoryHref} style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, color: "var(--text-muted)", textDecoration: "none" }}><ArrowLeft size={16} /> All schools</Link>
        <div className={styles.metricLabel}>SCHOOL PROFILE · {school.status.toUpperCase()}</div>
        <h1 className={styles.pageTitle}>{school.name}</h1>
        <p className={styles.pageSubtitle}>Registration {school.registration_no || "not provided"} · {school.official_email}</p>
      </header>
      {error && <p role="alert" style={{ marginBottom: 12 }}>{error}</p>}{notice && <p role="status" style={{ marginBottom: 12 }}>{notice}</p>}
      <div className={styles.sectionCard} style={{ marginBottom: 22 }}>
        <div className={styles.sectionHeader} style={{ marginBottom: 0 }}><div><strong>School access</strong><p style={{ color: "var(--text-muted)", marginTop: 5 }}>Status changes are recorded and apply to the whole school.</p></div>
          {!closed && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={busy} onClick={() => void act(() => rpc("set_school_status", { p_org: orgId, p_status: school.status === "active" ? "suspended" : "active", p_reason: "Updated from school detail" }), school.status === "active" ? "School suspended." : "School reactivated.")}>{school.status === "active" ? <><PauseCircle size={15} /> Suspend school</> : <><PlayCircle size={15} /> Reactivate school</>}</button>
            <button type="button" disabled={busy} onClick={() => void closeSchool()}>Close school</button>
          </div>}
        </div>
      </div>
      <div className={styles.metricsGrid}>
        <Metric icon={<Users size={18} />} title="Students" value={overview.people.students} hint={`${overview.people.staff + overview.people.owners} school staff`} />
        <Metric icon={<Trophy size={18} />} title="Tournament teams" value={overview.tournament.teams_total} hint={`${overview.tournament.participants} participants`} />
        <Metric icon={<BookOpen size={18} />} title="Course enrollments" value={overview.lms.enrollments} hint={`${overview.lms.lessons_completed} lessons complete`} />
        <Metric icon={<GraduationCap size={18} />} title="Average progress" value={`${overview.lms.avg_completion_pct}%`} hint={`${overview.people.pending_invites} pending invitations`} />
      </div>
      <div className={styles.filterGroup} role="tablist" aria-label="School details" style={{ marginBottom: 20 }}>
        <button type="button" role="tab" aria-selected={view === "tournament"} className={`${styles.filterBtn} ${view === "tournament" ? styles.filterBtnActive : ""}`} onClick={() => setView("tournament")}>Tournament</button>
        <button type="button" role="tab" aria-selected={view === "learning"} className={`${styles.filterBtn} ${view === "learning" ? styles.filterBtnActive : ""}`} onClick={() => setView("learning")}>Learning</button>
      </div>
      {view === "tournament" ? <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><span className={styles.metricLabel}>{tournament?.title ?? "TOURNAMENT"}</span><h2 className={styles.sectionTitle} style={{ marginTop: 7 }}>Team applications</h2></div><Link href="/dashboard/hanbee/tournament" style={{ color: "var(--text-main)" }}>Review all entries →</Link></div>
        <div className={styles.tableContainer}><table className={styles.dataTable}><thead><tr><th>Team</th><th>Captain</th><th>Players</th><th>Stage</th><th>Open chat</th></tr></thead><tbody>{teams.map((team) => <tr key={team.team_id}><td className={styles.cellHighlight}>{team.name}</td><td>{team.captain_name ?? "—"}</td><td>{team.member_count}/{team.team_size}</td><td>{team.status.replaceAll("_", " ")}</td><td>{team.chat_id ? <Link href={`/dashboard/chat?conversation=${encodeURIComponent(team.chat_id)}`}>Team chat</Link> : "—"}</td></tr>)}{teams.length === 0 && <tr><td colSpan={5}>No teams have been formed for the current tournament.</td></tr>}</tbody></table></div>
      </section> : <>
        <section className={styles.sectionCard} style={{ marginBottom: 20 }}><div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Course participation</h2><span className={styles.metricLabel}>READ ONLY</span></div>
          <div className={styles.tableContainer}><table className={styles.dataTable}><thead><tr><th>Course</th><th>Students</th><th>Average progress</th></tr></thead><tbody>{courses.map((course) => <tr key={course.course_id}><td className={styles.cellHighlight}>{course.title}</td><td>{course.students}</td><td>{course.avg_completion_pct}%</td></tr>)}{courses.length === 0 && <tr><td colSpan={3}>No course participation yet.</td></tr>}</tbody></table></div>
        </section>
        <section className={styles.sectionCard}><div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Students ({students.length})</h2><span className={styles.metricLabel}>ACCOUNT CONTROLS</span></div>
          <div className={styles.tableContainer}><table className={styles.dataTable}><thead><tr><th>Student</th><th>Team</th><th>Courses</th><th>Progress</th><th>Last active</th><th>Access</th><th>Actions</th></tr></thead><tbody>{students.map((student) => <tr key={student.student_id}><td>{student.full_name}<br /><small>{student.email}</small></td><td>{student.team_name ?? "—"}</td><td>{student.courses_enrolled}</td><td>{student.completion_pct}%</td><td>{student.last_active ? new Date(student.last_active).toLocaleDateString() : "—"}</td><td>{student.account_status}</td><td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{student.account_status === "active" ? <><button type="button" disabled={busyStudent === student.student_id || busy} onClick={() => void changeStudent(student, "suspend")}>Suspend</button><button type="button" disabled={busyStudent === student.student_id || busy} onClick={() => void changeStudent(student, "revoke")}>Revoke</button><button type="button" disabled={busyStudent === student.student_id || busy || closed} onClick={() => void changeStudent(student, "solo")}>Make solo</button></> : <button type="button" disabled={busyStudent === student.student_id || busy} onClick={() => void changeStudent(student, "restore")}>Restore</button>}</div></td></tr>)}{students.length === 0 && <tr><td colSpan={7}>No students are linked to this school.</td></tr>}</tbody></table></div>
        </section>
      </>}
    </div>
  );
}

function Metric({ icon, title, value, hint }: { icon: ReactNode; title: string; value: string | number; hint: string }) {
  return <article className={styles.metricCard}><div className={styles.metricCardHeader}><span className={styles.metricLabel}>{title}</span>{icon}</div><strong className={styles.metricValue}>{value}</strong><span className={styles.metricSubtext}>{hint}</span></article>;
}
