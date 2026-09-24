import { supabase } from "./supabaseClient";

// Every course/lesson page in this app still routes on a fake numeric id
// ("1") seeded long before there was a real database — see docs/PLAN.md
// §10.36's "explicitly not done" note. Rewiring every course-listing page's
// links to real Supabase UUIDs is its own round; until then, since exactly
// one course is seeded for real ("Intro to Design" — supabase/seed.mjs),
// this resolves it by title so lesson content and completion tracking can
// be genuinely real today without touching the wider routing surface.
const SEEDED_COURSE_TITLE = "Intro to Design";

let cachedCourseId: string | null = null;

export async function resolveSeededCourseId(): Promise<string | null> {
  if (cachedCourseId) return cachedCourseId;
  if (!supabase) return null;
  const { data } = await supabase.from("courses").select("id").eq("title", SEEDED_COURSE_TITLE).single();
  cachedCourseId = data?.id ?? null;
  return cachedCourseId;
}

export interface DbCourseListRow {
  id: string;
  title: string;
  description: string;
  cover_accent: string;
}

/** Published courses, for the student/public "browse courses" surfaces
 *  (StudentCoursesPage, ApplyPage) — replaces their hardcoded mock course
 *  arrays when Supabase is configured. RLS on `courses` already restricts
 *  an anon/student select to published rows (see supabase/migrations/
 *  0002_rls.sql), but the explicit filter is kept for clarity. */
export async function fetchPublishedCourses(): Promise<DbCourseListRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, cover_accent")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as DbCourseListRow[];
}

export interface DbLessonRow {
  id: string;
  title: string;
  content_type: "video" | "document" | "slides" | "link" | "text";
  published: boolean;
  body_text: string;
  external_url: string;
  youtube_id: string | null;
  sort_order: number;
  modules: { title: string; sort_order: number } | null;
}

/** Published lessons for the seeded course, in author-defined order
 *  (module sort, then lesson sort within it) — real content, replacing the
 *  hardcoded LESSONS array in StudentLessonViewerPage.tsx when Supabase is
 *  configured. */
export async function fetchPublishedLessons(): Promise<DbLessonRow[]> {
  if (!supabase) return [];
  const courseId = await resolveSeededCourseId();
  if (!courseId) return [];
  const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
  if (!modules || modules.length === 0) return [];
  const moduleIds = modules.map((m) => m.id);
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, content_type, published, body_text, external_url, youtube_id, sort_order, modules(title, sort_order)")
    .in("module_id", moduleIds)
    .eq("published", true);
  if (error || !data) return [];
  return (data as unknown as DbLessonRow[]).sort((a, b) => {
    const modDiff = (a.modules?.sort_order ?? 0) - (b.modules?.sort_order ?? 0);
    return modDiff !== 0 ? modDiff : a.sort_order - b.sort_order;
  });
}

/** The current student's enrollment id for the seeded course's section —
 *  needed to read/write lesson_completions, which key off enrollment, not
 *  the user id directly (an enrollment is per-section, and a student could
 *  in principle be enrolled in more than one section of the same course). */
export async function resolveMyEnrollmentId(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const courseId = await resolveSeededCourseId();
  if (!courseId) return null;
  const { data: sections } = await supabase.from("sections").select("id").eq("course_id", courseId);
  if (!sections || sections.length === 0) return null;
  const { data } = await supabase
    .from("enrollments")
    .select("id")
    .in("section_id", sections.map((s) => s.id))
    .eq("student_id", userId)
    .single();
  return data?.id ?? null;
}

export async function fetchMyCompletedLessonIds(enrollmentId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from("lesson_completions").select("lesson_id").eq("enrollment_id", enrollmentId);
  return new Set((data ?? []).map((row) => row.lesson_id));
}

/** The server derives the enrollment itself and enforces order, enrollment and
 *  quiz-unlock rules (migration 0019); the first argument is kept only so the
 *  existing lesson-viewer call site keeps compiling. Returns false when the
 *  server refuses. */
export async function markLessonComplete(_enrollmentId: string, lessonId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("complete_lesson", { p_lesson_id: lessonId });
  return !error;
}

export async function unmarkLessonComplete(enrollmentId: string, lessonId: string): Promise<void> {
  await supabase?.from("lesson_completions").delete().eq("enrollment_id", enrollmentId).eq("lesson_id", lessonId);
}
