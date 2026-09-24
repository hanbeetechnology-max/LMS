import { supabase } from "./supabaseClient";

// General-purpose staff-facing courses/modules/lessons CRUD layer, on top of
// `courses`/`modules`/`lessons`/`lesson_materials` (supabase/migrations/
// 0001_init.sql, 0002_rls.sql) — replaces StaffCourseEditorPage.tsx's local
// `useState`/`INITIAL_MODULES` mock array once a page is wired to it.
// Deliberately separate from `coursesApi.ts`, which stays as the narrow,
// title-resolved "seeded course" reader used by the already-live student
// lesson viewer (see its own comment / docs/PLAN.md §10.36) — this file has
// no notion of a single seeded course; every function operates on whichever
// course/module/lesson id is passed in, and `fetchAllCoursesForStaff` lists
// every course regardless of status, per RLS's staff/manager-sees-drafts
// allowance. Not yet wired into any page (see docs/PLAN.md).

export type CourseStatus = "draft" | "published" | "archived";
export type LessonContentType = "video" | "document" | "slides" | "link" | "text";

export interface CourseRow {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  coverAccent: string;
  createdAt: string;
}

export interface ModuleRow {
  id: string;
  title: string;
  sortOrder: number;
}

export interface LessonRow {
  id: string;
  title: string;
  contentType: LessonContentType;
  published: boolean;
  bodyText: string;
  externalUrl: string;
  youtubeId: string | null;
  sortOrder: number;
}

export interface MaterialRow {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  storagePath: string;
  uploadedAt: string;
}

// ----------------------------------------------------------------------------
// Courses
// ----------------------------------------------------------------------------

interface DbCourseRow {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  cover_accent: string;
  created_at: string;
}

/** Every course regardless of status — staff/manager can see drafts too, per
 *  the "published courses readable by all; drafts staff/manager only"
 *  policy on `courses`. A student/anon caller would only ever get published
 *  rows back, same as `coursesApi.fetchPublishedCourses`. */
export async function fetchAllCoursesForStaff(): Promise<CourseRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, status, cover_accent, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as DbCourseRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    coverAccent: row.cover_accent,
    createdAt: row.created_at,
  }));
}

/** Staff/manager-only per RLS ("staff/manager manage courses"). Always
 *  created as a draft — publishing is a separate, explicit `updateCourse`
 *  call. `owner_id` is required (`not null references profiles`) with no
 *  server-side default, so this resolves the acting user via
 *  `supabase.auth.getUser()` (the session's own `auth.uid()`) rather than
 *  requiring the caller to pass it in. Returns null (no insert attempted)
 *  if there's no signed-in session to resolve. */
export async function createCourse(input: {
  title: string;
  description: string;
  coverAccent: string;
}): Promise<string | null> {
  if (!supabase) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const ownerId = userData?.user?.id;
  if (userError || !ownerId) return null;
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title,
      description: input.description,
      cover_accent: input.coverAccent,
      owner_id: ownerId,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** Staff/manager-only per RLS. */
export async function updateCourse(
  id: string,
  patch: Partial<{ title: string; description: string; status: CourseStatus; coverAccent: string }>,
): Promise<boolean> {
  if (!supabase) return false;
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.coverAccent !== undefined) dbPatch.cover_accent = patch.coverAccent;
  const { error } = await supabase.from("courses").update(dbPatch).eq("id", id);
  return !error;
}

/** Staff/manager-only per RLS. `modules`/`sections`/`discussion_threads`
 *  all `references courses(id) on delete cascade`, so deleting a course
 *  cascades its modules/lessons/materials (lessons/materials cascade again
 *  from modules/lessons) — a real, not merely intended, cascade. */
export async function deleteCourse(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("courses").delete().eq("id", id);
  return !error;
}

// ----------------------------------------------------------------------------
// Modules
// ----------------------------------------------------------------------------

interface DbModuleRow {
  id: string;
  title: string;
  sort_order: number;
}

/** Readable by all signed-in users per RLS ("modules readable by all signed
 *  in"); filtered to one course here since that's how the staff editor
 *  navigates. */
export async function fetchModulesForCourse(courseId: string): Promise<ModuleRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("modules")
    .select("id, title, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as DbModuleRow[]).map((row) => ({ id: row.id, title: row.title, sortOrder: row.sort_order }));
}

/** Staff/manager-only per RLS ("staff/manager manage modules"). */
export async function createModule(courseId: string, title: string, sortOrder: number): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("modules")
    .insert({ course_id: courseId, title, sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** Staff/manager-only per RLS. */
export async function updateModule(id: string, patch: Partial<{ title: string; sortOrder: number }>): Promise<boolean> {
  if (!supabase) return false;
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
  const { error } = await supabase.from("modules").update(dbPatch).eq("id", id);
  return !error;
}

/** Staff/manager-only per RLS. `lessons` cascades from `modules`. */
export async function deleteModule(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("modules").delete().eq("id", id);
  return !error;
}

// ----------------------------------------------------------------------------
// Lessons
// ----------------------------------------------------------------------------

interface DbLessonRow {
  id: string;
  title: string;
  content_type: LessonContentType;
  published: boolean;
  body_text: string;
  external_url: string;
  youtube_id: string | null;
  sort_order: number;
}

/** Published-or-staff/manager per RLS ("published lessons readable by all;
 *  drafts staff/manager only") — a student caller would only get published
 *  lessons of this module back. */
export async function fetchLessonsForModule(moduleId: string): Promise<LessonRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, content_type, published, body_text, external_url, youtube_id, sort_order")
    .eq("module_id", moduleId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as DbLessonRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    contentType: row.content_type,
    published: row.published,
    bodyText: row.body_text,
    externalUrl: row.external_url,
    youtubeId: row.youtube_id,
    sortOrder: row.sort_order,
  }));
}

/** Staff/manager-only per RLS ("staff/manager manage lessons"). Created
 *  unpublished by default (`published` defaults to `false` in the schema)
 *  — publishing is a separate, explicit `updateLesson` call. */
export async function createLesson(
  moduleId: string,
  input: {
    title: string;
    contentType: LessonContentType;
    bodyText?: string;
    externalUrl?: string;
    youtubeId?: string;
    sortOrder: number;
  },
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title: input.title,
      content_type: input.contentType,
      body_text: input.bodyText ?? "",
      external_url: input.externalUrl ?? "",
      youtube_id: input.youtubeId ?? null,
      sort_order: input.sortOrder,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** Staff/manager-only per RLS. */
export async function updateLesson(
  id: string,
  patch: Partial<{
    title: string;
    contentType: LessonContentType;
    published: boolean;
    bodyText: string;
    externalUrl: string;
    youtubeId: string;
    sortOrder: number;
  }>,
): Promise<boolean> {
  if (!supabase) return false;
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.contentType !== undefined) dbPatch.content_type = patch.contentType;
  if (patch.published !== undefined) dbPatch.published = patch.published;
  if (patch.bodyText !== undefined) dbPatch.body_text = patch.bodyText;
  if (patch.externalUrl !== undefined) dbPatch.external_url = patch.externalUrl;
  if (patch.youtubeId !== undefined) dbPatch.youtube_id = patch.youtubeId;
  if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
  const { error } = await supabase.from("lessons").update(dbPatch).eq("id", id);
  return !error;
}

/** Staff/manager-only per RLS. `lesson_materials`/`lesson_completions`
 *  cascade from `lessons`. */
export async function deleteLesson(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  return !error;
}

// ----------------------------------------------------------------------------
// Materials (read-only — see docs/PLAN.md for the Storage-upload gap)
// ----------------------------------------------------------------------------

interface DbMaterialRow {
  id: string;
  file_name: string;
  file_size_bytes: number;
  storage_path: string;
  uploaded_at: string;
}

/** "Materials readable if the lesson is readable" per RLS — a student
 *  caller only sees materials on a published lesson. Read-only: actually
 *  uploading a file to Supabase Storage (and creating the matching row) is
 *  a separate, bigger piece — no Storage bucket exists live yet, see
 *  docs/PLAN.md. */
export async function fetchMaterialsForLesson(lessonId: string): Promise<MaterialRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lesson_materials")
    .select("id, file_name, file_size_bytes, storage_path, uploaded_at")
    .eq("lesson_id", lessonId)
    .order("uploaded_at", { ascending: true });
  if (error || !data) return [];
  return (data as DbMaterialRow[]).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
  }));
}
