"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchMyCourses, type StudentCourseSummary } from "../../../lib/coursesApi";
import styles from "./courses.module.css";

const tabs = ["All Courses", "In Progress", "Completed"] as const;
type CourseTab = (typeof tabs)[number];

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState<CourseTab>("All Courses");
  const [courses, setCourses] = useState<StudentCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchMyCourses()
      .then((result) => { if (!cancelled) setCourses(result); })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Couldn't load your courses.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [reloadKey]);

  const filteredCourses = useMemo(() => courses.filter((course) => {
    if (activeTab === "In Progress") return course.status === "in_progress";
    if (activeTab === "Completed") return course.status === "completed";
    return true;
  }), [activeTab, courses]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Courses &amp; Learning</h1>
        <p className={styles.pageSubtitle}>Your active and completed courses</p>
      </div>

      <div className={styles.tabs} aria-label="Filter courses">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <p role="status">Loading your courses…</p>}

      {!loading && error && (
        <div role="alert" style={{ padding: 24, color: "var(--text-main)" }}>
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </div>
      )}

      {!loading && !error && filteredCourses.length > 0 && (
        <div className={styles.coursesGrid}>
          {filteredCourses.map((course) => (
            <article key={course.id} className={styles.courseCard}>
              <div
                className={styles.courseImage}
                style={{ backgroundImage: "linear-gradient(135deg, var(--accent), var(--bg-card-hover))" }}
                aria-hidden="true"
              >
                <div className={styles.courseOverlay} />
              </div>

              <div className={styles.courseContent}>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>{course.moduleCount} modules</span>
                  {course.status === "completed" && (
                    <span className={`${styles.badge} ${styles.badgeCompleted}`}>Completed</span>
                  )}
                </div>
                <h2 className={styles.courseTitle}>{course.title}</h2>
                <p className={styles.courseInstructor}>
                  {course.sectionNames.join(", ") || "Enrolled course"} · {course.completedLessonCount} of {course.lessonCount} lessons complete
                </p>

                <div className={styles.progressSection}>
                  <div className={styles.progressTop}>
                    <span className={styles.progressLabel}>Progress</span>
                    <span className={styles.progressValue}>{course.progressPercent}%</span>
                  </div>
                  <div
                    className={styles.progressBar}
                    role="progressbar"
                    aria-label={`${course.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={course.progressPercent}
                  >
                    <div className={styles.progressFill} style={{ width: `${course.progressPercent}%` }} />
                  </div>
                </div>

                <Link
                  className={styles.courseActionBtn}
                  href={`/dashboard/courses/${course.id}`}
                  style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                >
                  {course.status === "completed" ? "Review Course" : course.progressPercent > 0 ? "Continue Course" : "Start Course"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && filteredCourses.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
          {courses.length === 0 ? "You don't have any active course enrollments yet." : "No courses match this filter."}
        </div>
      )}
    </div>
  );
}
