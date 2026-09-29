"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ChevronLeft, Play } from "lucide-react";
import { completeLesson, fetchCourseContent, type CourseContent, type CourseLesson } from "../../../../lib/coursesApi";
import styles from "./lesson.module.css";

export default function LessonViewer() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const [course, setCourse] = useState<CourseContent | null>(null);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadCourse() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchCourseContent(courseId);
      setCourse(result);
      setActiveLessonId((current) => {
        const allLessons = result.modules.flatMap((module) => module.lessons);
        return allLessons.some((lesson) => lesson.id === current)
          ? current
          : allLessons.find((lesson) => !lesson.completed)?.id ?? allLessons[0]?.id ?? "";
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load this course.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCourse(); }, [courseId]);

  const lessons = useMemo(() => course?.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  ) ?? [], [course]);
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = lessons[activeIndex] as (CourseLesson & { moduleTitle: string }) | undefined;

  async function markComplete() {
    if (!activeLesson || !course) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const certificateIssued = await completeLesson(activeLesson.id, course.id, course.title);
      setNotice(certificateIssued ? "Course complete. Your certificate has been issued." : "Lesson marked complete.");
      await loadCourse();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save lesson progress.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading course…</p>;
  if (error && !course) return <div role="alert"><p>{error}</p><button type="button" onClick={() => void loadCourse()}>Try again</button></div>;
  if (!course) return <p>This course isn't available.</p>;

  return (
    <div className={styles.lessonContainer}>
      <Link href="/dashboard/courses" className={styles.backButton}>
        <ChevronLeft size={16} /> Back to Courses
      </Link>

      <div className={styles.lessonHeader}>
        <div>
          <h1 className={styles.lessonTitle}>{activeLesson?.title ?? course.title}</h1>
          <p className={styles.lessonSubtitle}>{course.title}{activeLesson ? ` · ${activeLesson.moduleTitle}` : ""}</p>
        </div>
        <div className={styles.progressPill}>
          <span>{course.progressPercent}% complete</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${course.progressPercent}%` }} />
          </div>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <div className={styles.contentGrid}>
        <section className={styles.mainContent} aria-label="Lesson">
          {activeLesson ? (
            <>
              {activeLesson.youtubeId ? (
                <div className={styles.videoPlayerContainer}>
                  <iframe
                    title={activeLesson.title}
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeLesson.youtubeId)}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ width: "100%", height: "100%", border: 0 }}
                  />
                </div>
              ) : activeLesson.contentType === "video" && activeLesson.externalUrl ? (
                <div className={styles.videoPlayerContainer}>
                  <video controls src={activeLesson.externalUrl} style={{ width: "100%", height: "100%" }}>
                    Your browser does not support embedded video.
                  </video>
                </div>
              ) : null}

              <div className={styles.tabPanel}>
                <h2>{activeLesson.title}</h2>
                {activeLesson.bodyText
                  ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{activeLesson.bodyText}</p>
                  : <p>This lesson doesn't have written content.</p>}
                {activeLesson.externalUrl && activeLesson.contentType !== "video" && (
                  <p><a href={activeLesson.externalUrl} target="_blank" rel="noreferrer">Open lesson resource</a></p>
                )}
                <button
                  className={styles.actionButton}
                  type="button"
                  disabled={saving || activeLesson.completed}
                  onClick={() => void markComplete()}
                >
                  {saving ? "Saving…" : activeLesson.completed ? "Lesson completed" : "Mark lesson complete"}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.tabPanel}><p>This course has no published lessons yet.</p></div>
          )}
        </section>

        <aside className={styles.sidebarMenu}>
          <h2 className={styles.sidebarTitle}>Course syllabus</h2>
          {course.modules.map((module) => (
            <section key={module.id}>
              <h3>{module.title}</h3>
              <ul className={styles.syllabusList}>
                {module.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className={lesson.id === activeLessonId
                      ? styles.syllabusItemActive
                      : lesson.completed ? styles.syllabusItemCompleted : styles.syllabusItemLocked}
                  >
                    <button
                      type="button"
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
                      onClick={() => { setActiveLessonId(lesson.id); setNotice(""); }}
                    >
                      {lesson.completed ? <CheckCircle size={16} /> : <Play size={15} />}
                      <span>{lesson.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" disabled={activeIndex <= 0} onClick={() => setActiveLessonId(lessons[activeIndex - 1]?.id ?? "")}>Previous</button>
            <button type="button" disabled={activeIndex < 0 || activeIndex >= lessons.length - 1} onClick={() => setActiveLessonId(lessons[activeIndex + 1]?.id ?? "")}>Next</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
