"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, BookOpen, ClipboardList, GraduationCap, School, Users } from "lucide-react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

type Overview = {
  courses?: Record<string, number>;
  students?: number;
  solo_students?: number;
  enrollments?: number;
  avg_completion_pct?: number;
  course_applications_pending?: number;
  schools?: Record<string, number>;
};

const number = (value?: number) => new Intl.NumberFormat().format(value ?? 0);

export default function HanbeeLmsOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: profile, isLoading: profileLoading, error: profileError } = useSessionProfile();
  const canView = profile?.role === "staff" || profile?.role === "manager";

  useEffect(() => {
    if (profileLoading) return;
    if (profileError) { setError(profileError instanceof Error ? profileError.message : "We couldn't load the learning overview."); setLoading(false); return; }
    if (!canView) { setError("This overview is for approved Hanbee staff."); setLoading(false); return; }
    let active = true;
    authenticatedSupabaseFetch<Overview>("/rest/v1/rpc/site_lms_overview", { method: "POST", body: "{}" })
      .then((data) => { if (active) setOverview(data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the learning overview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileLoading, profileError, canView]);

  const courses = overview?.courses ?? {};
  const schools = overview?.schools ?? {};
  const published = courses.published ?? 0;
  const pendingApplications = overview?.course_applications_pending ?? 0;

  return <div>
    <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Learning platform</h1><p className={styles.pageSubtitle}>Hanbee course, enrollment, and student activity at a glance</p></div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading learning overview…</p> : <>
      <div className={styles.metricsRow} style={{ marginBottom: 24 }}>
        <Metric icon={<BookOpen size={18} />} label="Published courses" value={number(published)} detail={`${number(courses.draft)} drafts · ${number(courses.archived)} archived`} />
        <Metric icon={<GraduationCap size={18} />} label="Active students" value={number(overview?.students)} detail={`${number(overview?.solo_students)} learning independently`} />
        <Metric icon={<Activity size={18} />} label="Active enrollments" value={number(overview?.enrollments)} detail={`${number(overview?.avg_completion_pct)}% average completion`} />
        <Metric icon={<School size={18} />} label="Schools" value={number(Object.values(schools).reduce((sum, count) => sum + count, 0))} detail={`${number(schools.active)} active`} />
      </div>
      <section className={styles.sectionCard} style={{ marginBottom: 24 }}>
        <h2 className={styles.sectionTitle}>Needs your attention</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Review student applications and quiz submissions so learners can join courses and keep progressing.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Link className={styles.actionBtn} href="/dashboard/hanbee/applications"><ClipboardList size={16} /> Course applications <strong>{number(pendingApplications)}</strong></Link>
          <Link className={styles.actionBtn} href="/dashboard/hanbee/assessment-reviews"><Users size={16} /> Quiz reviews</Link>
          <Link className={styles.actionBtn} href="/dashboard/hanbee/courses"><BookOpen size={16} /> Manage courses</Link>
        </div>
      </section>
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Course catalog</h2>
        <div className={styles.metricsRow} style={{ marginTop: 14 }}>
          {Object.entries(courses).map(([status, count]) => <Metric key={status} label={status.replaceAll("_", " ")} value={number(count)} />)}
        </div>
      </section>
    </>}
  </div>;
}

function Metric({ icon, label, value, detail }: { icon?: ReactNode; label: string; value: string; detail?: string }) {
  return <article className={styles.metricCard}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><span className={styles.metricLabel}>{label}</span>{icon && <span style={{ color: "var(--accent)" }}>{icon}</span>}</div>
    <div className={styles.metricValue} style={{ marginTop: 12 }}>{value}</div>
    {detail && <p style={{ color: "var(--text-muted)", marginTop: 7, fontSize: 13 }}>{detail}</p>}
  </article>;
}
