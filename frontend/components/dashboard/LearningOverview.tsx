"use client";

import { useEffect, useState } from "react";
import { PlayCircle, BookOpen, ListChecks, Award } from "lucide-react";
import Link from "next/link";
import styles from "../dashboard.module.css";
import { fetchMyCourses, type StudentCourseSummary } from "../../lib/coursesApi";

export default function LearningOverview() {
  const [courses, setCourses] = useState<StudentCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyCourses()
      .then((result) => { if (active) setCourses(result); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load your courses.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const currentCourse = courses.find((course) => course.status === "in_progress") ?? courses[0];
  const inProgress = courses.filter((course) => course.status === "in_progress").length;
  const completed = courses.filter((course) => course.status === "completed").length;
  const completedLessons = courses.reduce((total, course) => total + course.completedLessonCount, 0);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Learning Overview</h1>
        <p className={styles.pageSubtitle}>Your courses and lesson progress</p>
      </div>

      {currentCourse ? (
        <div className={styles.sectionCard} style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 280px" }}>
            <span className={styles.metricLabel}>{currentCourse.status === "completed" ? "LAST COURSE" : "CONTINUE LEARNING"}</span>
            <h2 style={{ fontSize: 24, fontWeight: 500, marginTop: 8, marginBottom: 8 }}>{currentCourse.title}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
              {currentCourse.completedLessonCount} of {currentCourse.lessonCount} lessons completed
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 6, background: "var(--bg-card-hover)", borderRadius: 4, overflow: "hidden", maxWidth: 320 }}>
                <div style={{ height: "100%", width: `${currentCourse.progressPercent}%`, background: "var(--text-main)" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{currentCourse.progressPercent}%</span>
            </div>
          </div>
          <Link href={`/dashboard/courses/${encodeURIComponent(currentCourse.id)}`} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", padding: "12px 24px", borderRadius: 12, boxShadow: "var(--clay-shadow-button)", color: "var(--text-main)", fontWeight: 500, textDecoration: "none" }}>
            <PlayCircle size={18} /> {currentCourse.status === "completed" ? "Review Course" : "Resume Course"}
          </Link>
        </div>
      ) : (
        <div className={styles.sectionCard} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>{loading ? "Loading your courses…" : "No courses yet"}</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>{error || "Courses assigned to your account will appear here."}</p>
          <Link href="/dashboard/courses" style={{ color: "var(--text-main)" }}>Browse my courses</Link>
        </div>
      )}

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Courses in Progress</span><BookOpen size={16} className={styles.metricIcon} /></div>
          <div className={styles.metricValue}>{loading ? "—" : inProgress}</div>
          <div className={styles.metricSubtext}>Assigned and active</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Lessons Completed</span><ListChecks size={16} className={styles.metricIcon} /></div>
          <div className={styles.metricValue}>{loading ? "—" : completedLessons}</div>
          <div className={styles.metricSubtext}>Across your courses</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Courses Completed</span><Award size={16} className={styles.metricIcon} /></div>
          <div className={styles.metricValue}>{loading ? "—" : completed}</div>
          <div className={styles.metricSubtext}>Fully completed courses</div>
        </div>
      </div>
    </div>
  );
}
