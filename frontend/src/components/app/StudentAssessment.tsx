import { useEffect, useState } from "react";
import {
  fetchAssessmentSubmission,
  fetchStudentAssessment,
  submitStudentAssessment,
  type AssessmentSubmission,
  type StudentAssessment as StudentAssessmentData,
} from "../../lib/assessmentApi";

/**
 * A post-video multiple-choice check-in for a video lesson (docs/PLAN.md
 * §10.44). Auto-graded server-side (submit_assessment RPC — the correct
 * answer is never sent to this component; only redacted option labels are,
 * via assessment_options_public). `unlocked` reflects
 * assessment_submissions_effective: either a staff member verified it, or
 * the 10-minute soft SLA elapsed — a failed quiz still reaches that queue
 * and still auto-unlocks, it's never a silent trap (see
 * supabase/migrations/0008_assessment_verification_fix.sql).
 */
export function StudentAssessment({
  lessonId,
  enrollmentId,
  onStatus,
}: {
  lessonId: string;
  enrollmentId: string;
  onStatus: (hasAssessment: boolean, unlocked: boolean) => void;
}) {
  const [assessment, setAssessment] = useState<StudentAssessmentData | null>(null);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStudentAssessment(lessonId)
      .then(async (result): Promise<[StudentAssessmentData | null, AssessmentSubmission | null]> =>
        result ? [result, await fetchAssessmentSubmission(result.id, enrollmentId)] : [null, null],
      )
      .then(([result, currentSubmission]) => {
        if (cancelled) return;
        setAssessment(result);
        setSubmission(currentSubmission);
        onStatus(Boolean(result), currentSubmission?.unlocked ?? false);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this knowledge check.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollmentId, lessonId, onStatus]);

  // Polls toward the 10-minute soft-unlock deadline while a submission is
  // pending — a student shouldn't need to reload to see it unlock. Matches
  // the ~15s heartbeat cadence already used elsewhere in this app
  // (auto-attendance), rather than one long setTimeout that a browser tab
  // sleeping/throttling in the background could delay well past the SLA.
  useEffect(() => {
    if (!submission || submission.unlocked || submission.status !== "pending") return;
    const interval = window.setInterval(() => {
      if (new Date(submission.autoUnlockAt).getTime() <= Date.now()) {
        setSubmission((current) => (current ? { ...current, unlocked: true } : current));
        onStatus(true, true);
      }
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [onStatus, submission]);

  if (loading) return <p className="mt-6 text-sm text-(--color-mist)">Loading knowledge check…</p>;
  if (error) {
    return (
      <p role="alert" className="mt-6 rounded-xl bg-(--color-error-soft) px-4 py-3 text-sm text-(--color-error)">
        {error}
      </p>
    );
  }
  if (!assessment) return null;
  const loadedAssessment = assessment;

  async function submit() {
    if (loadedAssessment.questions.some((question) => !answers[question.id])) {
      setError("Answer every question before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitStudentAssessment(loadedAssessment.id, enrollmentId, answers);
      setSubmission(result);
      onStatus(true, result.unlocked);
    } catch {
      setError("Couldn't submit the knowledge check.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabel = submission
    ? submission.unlocked
      ? "Unlocked — you can continue"
      : "A staff member is reviewing this — usually within about 10 minutes"
    : null;

  return (
    <div className="mt-6 rounded-2xl border border-(--color-line) p-5">
      <h2 className="font-display text-lg font-semibold text-(--color-ink)">{loadedAssessment.title}</h2>
      {submission && (
        <p className="mt-1 text-sm text-(--color-slate)">
          Score: {submission.score}% · {statusLabel}
        </p>
      )}

      {!submission?.unlocked && (
        <div className="mt-4 flex flex-col gap-5">
          {loadedAssessment.questions.map((question, index) => (
            <fieldset key={question.id} disabled={submission !== null}>
              <legend className="text-sm font-medium text-(--color-ink)">
                {index + 1}. {question.prompt}
              </legend>
              <div className="mt-2 flex flex-col gap-2">
                {question.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm text-(--color-ink-soft)">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option.id}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                      className="accent-(--color-violet)"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-(--color-error-soft) px-3 py-2 text-xs text-(--color-error)">
          {error}
        </p>
      )}

      {!submission && (
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-5 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
        >
          {submitting ? "Submitting…" : "Submit knowledge check"}
        </button>
      )}
    </div>
  );
}
