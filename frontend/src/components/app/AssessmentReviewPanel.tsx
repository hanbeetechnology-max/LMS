import { useEffect, useState } from "react";
import { fetchPendingAssessmentSubmissions, verifyAssessmentSubmission, type PendingAssessmentSubmission } from "../../lib/assessmentApi";
import { useAuth } from "../../lib/AuthProvider";
import { useToast } from "../../lib/ToastProvider";

export function AssessmentReviewPanel() {
  const { authSource } = useAuth();
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<PendingAssessmentSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authSource !== "supabase") return;
    fetchPendingAssessmentSubmissions().then(setSubmissions).catch((loadError: unknown) => {
      const message = loadError instanceof Error ? loadError.message : "";
      setError(
        message.includes("assessment_submissions")
          ? "Assessment review is unavailable because migration 0007_assessment_submissions.sql has not been applied to Supabase."
          : "Couldn't load assessment submissions.",
      );
    });
  }, [authSource]);

  async function verify(id: string) {
    try {
      await verifyAssessmentSubmission(id);
      setSubmissions((current) => current.filter((submission) => submission.id !== id));
      showToast("Assessment verified. The student can continue.");
    } catch {
      setError("Couldn't verify this assessment.");
    }
  }

  if (authSource !== "supabase" || (!error && submissions.length === 0)) return null;

  return (
    <section className="mt-8 rounded-2xl border border-(--color-line) p-6">
      <h3 className="font-display text-lg font-semibold text-(--color-ink)">Assessment review</h3>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-(--color-error)">{error}</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-(--color-line)">
          {submissions.map((submission) => (
            <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-(--color-ink-soft)">{submission.assessmentTitle}</p>
                <p className="text-xs text-(--color-mist)">Score {submission.score}% · {new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => verify(submission.id)} className="rounded-full bg-(--color-ink) px-4 py-2 text-xs font-semibold text-(--color-paper)">
                Verify
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
