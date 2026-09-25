import { Link } from "react-router-dom";
import { fetchMyAssessmentSubmissions, type MyAssessmentSubmission } from "../../lib/assessmentApi";
import { Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatCard, relativeTime, useAsync } from "../kit";
import { ReviewStatus, ScoreCell, useNow } from "../shared/learning/parts";
import { primaryBtn, textLink } from "./shared";

function ReviewCard({ r, now }: { r: MyAssessmentSubmission; now: number }) {
  const unlocked = r.status === "verified" || new Date(r.autoUnlockAt).getTime() <= now;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-(--color-ink)">{r.lessonTitle || r.assessmentTitle}</h3>
          <p className="text-sm text-(--color-slate)">{r.courseTitle}</p>
        </div>
        <div className="text-right">
          <ReviewStatus status={r.status} autoUnlockAt={r.autoUnlockAt} now={now} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <ScoreCell score={r.score} passed={r.passed} />
          <span className="text-xs text-(--color-mist)">Submitted {relativeTime(r.submittedAt)}</span>
          {r.status === "pending" && unlocked && <span className="text-xs text-(--color-teal-deep)">You can continue to the next lesson.</span>}
        </span>
        {r.courseId && r.lessonId && (
          <Link to={`/student/courses/${r.courseId}/lessons/${r.lessonId}`} className={textLink}>
            Open lesson
          </Link>
        )}
      </div>
    </Card>
  );
}

export function LmsReviewsPage() {
  const { data, loading, error, reload } = useAsync(fetchMyAssessmentSubmissions, []);
  const now = useNow();
  const rows = data ?? [];
  const waiting = rows.filter((r) => r.status === "pending").length;
  const verified = rows.filter((r) => r.status === "verified").length;
  const avg = rows.length ? Math.round(rows.reduce((n, r) => n + r.score, 0) / rows.length) : 0;

  return (
    <>
      <PageHeader title="Lesson reviews" subtitle="Your lesson quizzes and where each one stands." />
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No lesson quizzes taken yet"
          body="After a video lesson with a quiz, your answers are checked and reviewed here."
          action={
            <Link to="/student/lms/courses" className={primaryBtn}>
              Go to my courses
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Waiting" value={waiting} tone={waiting > 0 ? "warn" : "neutral"} />
            <StatCard label="Verified" value={verified} tone="good" />
            <StatCard label="Average score" value={`${avg}%`} />
          </div>
          <div className="space-y-3">
            {rows.map((r) => (
              <ReviewCard key={r.id} r={r} now={now} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
