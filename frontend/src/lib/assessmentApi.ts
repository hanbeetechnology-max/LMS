import { supabase } from "./supabaseClient";

export interface AssessmentOption {
  id: string;
  label: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  sortOrder: number;
  options: AssessmentOption[];
}

export interface LessonAssessment {
  id: string;
  lessonId: string;
  title: string;
  questions: AssessmentQuestion[];
}

export interface StudentAssessment {
  id: string;
  lessonId: string;
  title: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
  }>;
}

export interface AssessmentSubmission {
  id: string;
  score: number;
  passed: boolean;
  status: "pending" | "verified" | "failed";
  submittedAt: string;
  autoUnlockAt: string;
  unlocked: boolean;
}

export async function fetchStudentAssessment(lessonId: string): Promise<StudentAssessment | null> {
  if (!supabase) return null;
  const { data: assessment, error } = await supabase.from("assessments").select("id, lesson_id, title").eq("lesson_id", lessonId).maybeSingle();
  if (error) throw error;
  if (!assessment) return null;
  const { data: questions, error: questionError } = await supabase
    .from("assessment_questions")
    .select("id, prompt, sort_order")
    .eq("assessment_id", assessment.id)
    .order("sort_order");
  if (questionError) throw questionError;
  const ids = (questions ?? []).map((question) => question.id);
  const { data: options, error: optionError } = ids.length
    ? await supabase.from("assessment_options_public").select("id, question_id, label, sort_order").in("question_id", ids).order("sort_order")
    : { data: [], error: null };
  if (optionError) throw optionError;
  return {
    id: assessment.id,
    lessonId: assessment.lesson_id,
    title: assessment.title,
    questions: (questions ?? []).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: (options ?? []).filter((option) => option.question_id === question.id).map((option) => ({ id: option.id, label: option.label })),
    })),
  };
}

export async function fetchAssessmentSubmission(assessmentId: string, enrollmentId: string): Promise<AssessmentSubmission | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("assessment_submissions_effective")
    .select("id, score, passed, status, submitted_at, auto_unlock_at, unlocked")
    .eq("assessment_id", assessmentId)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        score: data.score,
        passed: data.passed,
        status: data.status,
        submittedAt: data.submitted_at,
        autoUnlockAt: data.auto_unlock_at,
        unlocked: data.unlocked,
      }
    : null;
}

export async function submitStudentAssessment(assessmentId: string, enrollmentId: string, answers: Record<string, string>): Promise<AssessmentSubmission> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("submit_assessment", {
    p_assessment_id: assessmentId,
    p_enrollment_id: enrollmentId,
    p_answers: answers,
  });
  if (error || !data) throw error ?? new Error("Assessment submission failed.");
  const submission = Array.isArray(data) ? data[0] : data;
  return {
    id: submission.id,
    score: submission.score,
    passed: submission.passed,
    status: submission.status,
    submittedAt: submission.submitted_at,
    autoUnlockAt: submission.auto_unlock_at,
    unlocked: submission.status === "verified" || new Date(submission.auto_unlock_at).getTime() <= Date.now(),
  };
}

export interface PendingAssessmentSubmission {
  id: string;
  score: number;
  submittedAt: string;
  assessmentTitle: string;
}

export async function fetchPendingAssessmentSubmissions(): Promise<PendingAssessmentSubmission[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("assessment_submissions")
    .select("id, score, submitted_at, assessments(title)")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });
  if (error) {
    if (error.code === "42P01" || error.message.includes("assessment_submissions")) {
      throw new Error("assessment_submissions migration is not applied");
    }
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    score: row.score,
    submittedAt: row.submitted_at,
    assessmentTitle: (row.assessments as unknown as { title: string } | null)?.title ?? "Knowledge check",
  }));
}

export async function verifyAssessmentSubmission(submissionId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("verify_assessment_submission", { p_submission_id: submissionId });
  if (error) throw error;
}

export async function fetchAssessmentForLesson(lessonId: string): Promise<LessonAssessment | null> {
  if (!supabase) return null;
  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("id, lesson_id, title")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (assessmentError) throw assessmentError;
  if (!assessment) return null;

  const { data: questions, error: questionError } = await supabase
    .from("assessment_questions")
    .select("id, prompt, sort_order")
    .eq("assessment_id", assessment.id)
    .order("sort_order");
  if (questionError) throw questionError;

  const questionIds = (questions ?? []).map((question) => question.id);
  const { data: options, error: optionError } = questionIds.length
    ? await supabase.from("assessment_options").select("id, question_id, label, is_correct, sort_order").in("question_id", questionIds).order("sort_order")
    : { data: [], error: null };
  if (optionError) throw optionError;

  return {
    id: assessment.id,
    lessonId: assessment.lesson_id,
    title: assessment.title,
    questions: (questions ?? []).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      sortOrder: question.sort_order,
      options: (options ?? [])
        .filter((option) => option.question_id === question.id)
        .map((option) => ({
          id: option.id,
          label: option.label,
          isCorrect: option.is_correct,
          sortOrder: option.sort_order,
        })),
    })),
  };
}

export async function saveAssessmentDraft(
  lessonId: string,
  createdBy: string,
  draft: Pick<LessonAssessment, "title" | "questions">,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .upsert({ lesson_id: lessonId, created_by: createdBy, title: draft.title }, { onConflict: "lesson_id" })
    .select("id")
    .single();
  if (assessmentError || !assessment) throw assessmentError ?? new Error("Assessment was not saved.");

  const { error: deleteError } = await supabase.from("assessment_questions").delete().eq("assessment_id", assessment.id);
  if (deleteError) throw deleteError;

  for (const [questionIndex, question] of draft.questions.entries()) {
    const { data: insertedQuestion, error: questionError } = await supabase
      .from("assessment_questions")
      .insert({ assessment_id: assessment.id, prompt: question.prompt, sort_order: questionIndex })
      .select("id")
      .single();
    if (questionError || !insertedQuestion) throw questionError ?? new Error("Question was not saved.");

    const { error: optionError } = await supabase.from("assessment_options").insert(
      question.options.map((option, optionIndex) => ({
        question_id: insertedQuestion.id,
        label: option.label,
        is_correct: option.isCorrect,
        sort_order: optionIndex,
      })),
    );
    if (optionError) throw optionError;
  }
}
