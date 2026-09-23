import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";
import { CertificateIcon, CoursesIcon, LockIcon } from "../../components/landing/icons";
import { YouTubePlayer } from "../../components/app/YouTubePlayer";
import { StudentAssessment } from "../../components/app/StudentAssessment";
import { markdownToHtml } from "../../lib/markdown";
import { useAuth } from "../../lib/AuthProvider";
import {
  fetchMyCompletedLessonIds,
  fetchPublishedLessons,
  markLessonComplete,
  resolveMyEnrollmentId,
  unmarkLessonComplete,
  type DbLessonRow,
} from "../../lib/coursesApi";

type ContentType = "video" | "document" | "slides" | "link" | "text";

interface Lesson {
  id: string;
  title: string;
  module: string;
  contentType: ContentType;
  body?: string;
  externalUrl?: string;
  youtubeId?: string;
}

const LESSONS: Lesson[] = [
  { id: "l1", title: "Welcome & syllabus", module: "Module 1: Foundations", contentType: "text", body: "Welcome to Intro to Design! Over the next 6 weeks we'll cover color theory, typography, and layout fundamentals." },
  { id: "l2", title: "Color Theory", module: "Module 1: Foundations", contentType: "video", youtubeId: "_2LLXnUdUIc" },
  { id: "l3", title: "Reading: principles of design", module: "Module 1: Foundations", contentType: "document" },
  { id: "l4", title: "Type pairing", module: "Module 2: Typography", contentType: "slides" },
  {
    id: "l5",
    title: "Further reading",
    module: "Module 2: Typography",
    contentType: "link",
    externalUrl: "https://www.interaction-design.org/literature/topics/typography",
  },
];

function ContentRenderer({ lesson }: { lesson: Lesson }) {
  switch (lesson.contentType) {
    case "video":
      return lesson.youtubeId ? (
        <YouTubePlayer videoId={lesson.youtubeId} title={lesson.title} />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl bg-(--color-ink) text-(--color-paper)/60">
          <span className="text-sm">Video not available yet</span>
        </div>
      );
    case "document":
      return (
        <div className="flex aspect-4/3 items-center justify-center rounded-2xl border border-(--color-line) bg-(--color-cloud) text-(--color-mist)">
          <span className="text-sm">Document preview</span>
        </div>
      );
    case "slides":
      return (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-(--color-line) bg-(--color-cloud) text-(--color-mist)">
          <span className="text-sm">Slide deck</span>
        </div>
      );
    case "link":
      return (
        <a
          href={lesson.externalUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-(--color-line) p-5 text-sm font-medium text-(--color-violet) transition-colors hover:border-(--color-violet)"
        >
          External resource ↗
        </a>
      );
    default:
      return (
        <div
          className="prose-lesson text-[15px] leading-relaxed text-(--color-ink-soft) [&_ul]:list-disc [&_ul]:pl-5 [&_p+p]:mt-3 [&_p+ul]:mt-3 [&_ul+p]:mt-3"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(lesson.body ?? "") }}
        />
      );
  }
}

function loadCompletedIds(courseId: string | undefined): Set<string> {
  try {
    const raw = sessionStorage.getItem(`hanbeelms.course.${courseId}.completedLessons`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dbRowToLesson(row: DbLessonRow): Lesson {
  return {
    id: row.id,
    title: row.title,
    module: row.modules?.title ?? "",
    contentType: row.content_type,
    body: row.body_text,
    externalUrl: row.external_url,
    youtubeId: row.youtube_id ?? undefined,
  };
}

export function StudentLessonViewerPage() {
  const { id, lessonId } = useParams();
  const { profile, authSource } = useAuth();

  // Real data (docs/PLAN.md §10.44 Phase 1) when Supabase is live and this
  // student has a real enrollment; falls back to the original mock
  // LESSONS/sessionStorage path otherwise.
  const [realLessons, setRealLessons] = useState<Lesson[] | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loadingReal, setLoadingReal] = useState(authSource === "supabase");
  const [completedIds, setCompletedIds] = useState<Set<string>>(() =>
    authSource === "supabase" ? new Set() : loadCompletedIds(id),
  );

  // A video lesson with a post-video assessment (Phase 3) can't be marked
  // complete by hand — completion is only ever written once the assessment
  // resolves (verified by staff, or the 10-minute soft SLA elapses). These
  // three flags, reported by <StudentAssessment> via onStatus, gate the
  // "Mark complete" button for exactly that lesson; every other lesson
  // (non-video, or a video with no assessment) is unaffected.
  const [assessmentChecked, setAssessmentChecked] = useState(false);
  const [assessmentRequired, setAssessmentRequired] = useState(false);
  const [assessmentUnlocked, setAssessmentUnlocked] = useState(true);

  useEffect(() => {
    if (authSource !== "supabase" || !profile) {
      setLoadingReal(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [rows, myEnrollmentId] = await Promise.all([fetchPublishedLessons(), resolveMyEnrollmentId(profile.id)]);
      if (cancelled) return;
      if (rows.length > 0 && myEnrollmentId) {
        setRealLessons(rows.map(dbRowToLesson));
        setEnrollmentId(myEnrollmentId);
        setCompletedIds(await fetchMyCompletedLessonIds(myEnrollmentId));
      } else {
        // No real course data reachable for this student yet — fall back to
        // the mock lesson set rather than showing a dead end.
        setCompletedIds(loadCompletedIds(id));
      }
      setLoadingReal(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSource, profile?.id]);

  const usingReal = realLessons !== null;
  const lessons = realLessons ?? LESSONS;

  useEffect(() => {
    if (usingReal) return;
    try {
      sessionStorage.setItem(`hanbeelms.course.${id}.completedLessons`, JSON.stringify([...completedIds]));
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — locking still
      // works within the current mount, it just won't survive a navigation.
    }
  }, [id, completedIds, usingReal]);

  const handleAssessmentStatus = useCallback((hasAssessment: boolean, unlocked: boolean) => {
    setAssessmentChecked(true);
    setAssessmentRequired(hasAssessment);
    setAssessmentUnlocked(unlocked);
  }, []);

  if (loadingReal) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-(--color-mist)">Loading lesson…</div>;
  }

  const rawIndex = lessons.findIndex((l) => l.id === lessonId);
  // An unrecognized lessonId (e.g. StudentCoursesPage's still-mock "l1"
  // entry link landing on a real, UUID-keyed lesson set) means "start of
  // course" — index 0 is never past the lock boundary either, so this is
  // always safe regardless of completion state.
  const index = rawIndex === -1 ? 0 : rawIndex;
  const lesson = lessons[index];
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const completed = completedIds.has(lesson.id);
  const allComplete = completedIds.size >= lessons.length;
  const assessmentGated = usingReal && lesson.contentType === "video" && (!assessmentChecked || (assessmentRequired && !assessmentUnlocked));

  // Course content unlocks in order — a student can't jump ahead of the
  // first lesson they haven't finished yet. Direct URL navigation past that
  // point (not just the in-page "next" link) is redirected back.
  const firstIncompleteIndex = lessons.findIndex((l) => !completedIds.has(l.id));
  const lockBoundary = firstIncompleteIndex === -1 ? lessons.length - 1 : firstIncompleteIndex;
  if (index > lockBoundary) {
    return <Navigate to={`/student/courses/${id}/lessons/${lessons[lockBoundary].id}`} replace />;
  }

  function toggleComplete() {
    if (assessmentGated) return;
    const willComplete = !completedIds.has(lesson.id);
    if (usingReal && enrollmentId) {
      if (willComplete) markLessonComplete(enrollmentId, lesson.id);
      else unmarkLessonComplete(enrollmentId, lesson.id);
    }
    setCompletedIds((prev) => {
      const set = new Set(prev);
      if (set.has(lesson.id)) set.delete(lesson.id);
      else set.add(lesson.id);
      return set;
    });
  }

  return (
    <>
      <Seo title={lesson.title} description="Course lesson on HanbeeLms." path={`/student/courses/${id}/lessons/${lesson.id}`} />

      <Reveal className="flex items-center gap-2 text-sm text-(--color-mist)">
        <Link to="/student/courses" className="flex items-center gap-1.5 hover:text-(--color-ink)">
          <CoursesIcon />
          Intro to Design
        </Link>
        <span>/</span>
        <span>{lesson.module}</span>
        <span>/</span>
        <span className="text-(--color-ink-soft)">{lesson.title}</span>
      </Reveal>

      <Reveal delay={0.1} className="mt-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">{lesson.title}</h1>
        <div className="mt-6">
          <ContentRenderer lesson={lesson} />
        </div>

        <div className="mt-6 rounded-xl border border-(--color-line) p-4">
          <p className="text-sm font-medium text-(--color-ink)">Materials</p>
          <p className="mt-2 text-sm text-(--color-mist)">No downloadable materials for this lesson.</p>
        </div>

        {usingReal && enrollmentId && lesson.contentType === "video" && (
          <StudentAssessment lessonId={lesson.id} enrollmentId={enrollmentId} onStatus={handleAssessmentStatus} />
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleComplete}
            disabled={assessmentGated}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100 ${
              completed ? "bg-(--color-teal) text-(--color-ink-fixed)" : "bg-(--color-ink) text-(--color-paper)"
            }`}
          >
            {completed ? "✓ Completed" : "Mark complete"}
          </button>
          {allComplete && (
            <Link
              to={`/student/courses/${id}/certificate`}
              className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-5 py-3 text-sm font-semibold text-(--color-ink) transition-colors hover:border-(--color-violet) hover:text-(--color-violet)"
            >
              <CertificateIcon />
              View certificate
            </Link>
          )}
        </div>
      </Reveal>

      <div className="sticky bottom-6 mt-8 flex items-center justify-between rounded-2xl border border-(--color-line) bg-(--color-paper) px-5 py-4 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)]">
        {prev ? (
          <Link to={`/student/courses/${id}/lessons/${prev.id}`} className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          completed ? (
            <Link to={`/student/courses/${id}/lessons/${next.id}`} className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">
              {next.title} →
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-(--color-mist)" title="Mark this lesson complete to continue">
              <LockIcon />
              {next.title}
            </span>
          )
        ) : (
          <span />
        )}
      </div>
    </>
  );
}
