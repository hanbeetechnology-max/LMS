import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import {
  fetchAssessmentForLesson,
  saveAssessmentDraft,
  type AssessmentQuestion,
  type LessonAssessment,
} from "../../lib/assessmentApi";
import { useToast } from "../../lib/ToastProvider";

function newQuestion(index: number): AssessmentQuestion {
  return {
    id: `new-question-${index}`,
    prompt: "",
    sortOrder: index,
    options: [
      { id: `new-option-${index}-1`, label: "", isCorrect: true, sortOrder: 0 },
      { id: `new-option-${index}-2`, label: "", isCorrect: false, sortOrder: 1 },
    ],
  };
}

export function AssessmentEditor({ lessonId, enabled }: { lessonId: string; enabled: boolean }) {
  const { authSource, profile } = useAuth();
  const { showToast } = useToast();
  const [assessment, setAssessment] = useState<LessonAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || authSource !== "supabase") return;
    let cancelled = false;
    setLoading(true);
    fetchAssessmentForLesson(lessonId)
      .then((result) => {
        if (!cancelled) setAssessment(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the knowledge check.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authSource, enabled, lessonId]);

  if (!enabled) return null;

  function startAssessment() {
    setAssessment({ id: "", lessonId, title: "Lesson check", questions: [newQuestion(0)] });
    setError(null);
  }

  function updateQuestion(questionId: string, patch: Partial<AssessmentQuestion>) {
    setAssessment((current) =>
      current ? { ...current, questions: current.questions.map((question) => (question.id === questionId ? { ...question, ...patch } : question)) } : current,
    );
  }

  function updateOption(questionId: string, optionId: string, label: string) {
    setAssessment((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.id === questionId
                ? { ...question, options: question.options.map((option) => (option.id === optionId ? { ...option, label } : option)) }
                : question,
            ),
          }
        : current,
    );
  }

  function setCorrectOption(questionId: string, optionId: string) {
    setAssessment((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.id === questionId
                ? { ...question, options: question.options.map((option) => ({ ...option, isCorrect: option.id === optionId })) }
                : question,
            ),
          }
        : current,
    );
  }

  async function save() {
    if (!assessment || !profile) return;
    const invalid = assessment.questions.some(
      (question) =>
        !question.prompt.trim() ||
        question.options.length < 2 ||
        question.options.some((option) => !option.label.trim()) ||
        question.options.filter((option) => option.isCorrect).length !== 1,
    );
    if (invalid) {
      setError("Each question needs a prompt, two filled options, and exactly one correct answer.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveAssessmentDraft(lessonId, profile.id, assessment);
      showToast("Knowledge check saved.");
    } catch {
      setError("Couldn't save the knowledge check. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-(--color-line) p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-(--color-ink)">Knowledge check</p>
          <p className="mt-0.5 text-xs text-(--color-mist)">Add one or more multiple-choice questions after this video.</p>
        </div>
        {authSource !== "supabase" ? (
          <span className="text-xs text-(--color-mist)">Available with a connected course.</span>
        ) : !assessment && !loading ? (
          <button type="button" onClick={startAssessment} className="rounded-full bg-(--color-ink) px-4 py-2 text-xs font-semibold text-(--color-paper)">
            Add knowledge check
          </button>
        ) : null}
      </div>

      {loading && <p className="mt-4 text-sm text-(--color-mist)">Loading knowledge check…</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-(--color-error-soft) px-3 py-2 text-xs text-(--color-error)">{error}</p>}

      {assessment && !loading && (
        <div className="mt-4 flex flex-col gap-4">
          <input
            aria-label="Knowledge check title"
            value={assessment.title}
            onChange={(event) => setAssessment({ ...assessment, title: event.target.value })}
            className="rounded-lg border border-(--color-line) bg-(--color-paper) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
          />
          {assessment.questions.map((question, index) => (
            <div key={question.id} className="rounded-lg bg-(--color-cloud) p-3">
              <input
                aria-label={`Question ${index + 1}`}
                value={question.prompt}
                onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                placeholder={`Question ${index + 1}`}
                className="w-full rounded-lg border border-(--color-line) bg-(--color-paper) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
              />
              <div className="mt-2 flex flex-col gap-2">
                {question.options.map((option, optionIndex) => (
                  <label key={option.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={option.isCorrect}
                      onChange={() => setCorrectOption(question.id, option.id)}
                      aria-label={`Correct answer for question ${index + 1}, option ${optionIndex + 1}`}
                      className="accent-(--color-teal)"
                    />
                    <input
                      aria-label={`Option ${index + 1}.${optionIndex + 1}`}
                      value={option.label}
                      onChange={(event) => updateOption(question.id, option.id, event.target.value)}
                      placeholder={`Option ${optionIndex + 1}`}
                      className="min-w-0 flex-1 rounded-lg border border-(--color-line) bg-(--color-paper) px-3 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAssessment({ ...assessment, questions: [...assessment.questions, newQuestion(assessment.questions.length)] })} className="rounded-full border border-(--color-line) px-4 py-2 text-xs font-medium text-(--color-ink-soft)">
              + Add question
            </button>
            <button type="button" onClick={save} disabled={saving} className="rounded-full bg-(--color-ink) px-4 py-2 text-xs font-semibold text-(--color-paper) disabled:opacity-60">
              {saving ? "Saving…" : "Save knowledge check"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
