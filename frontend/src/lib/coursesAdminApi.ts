import { supabase } from "./supabaseClient";
import type { ContentType, CoverAccent } from "./courseTypes";

// Phase 1 of docs/PLAN.md §10.44: staff course/lesson authoring becoming
// real. Only courses created going forward (via StaffNewCoursePage, which
// now inserts a real row and gets back a real uuid) are backed by these
// functions — a course reached via one of the legacy fake numeric ids
// ("1", "2" — see StaffCoursesPage's still-mock listing) keeps using
// StaffCourseEditorPage's original local-only editing, same as before this
// round. Rewiring that listing to real ids app-wide is the already-once-
// deferred, separate piece of work coursesApi.ts's own comment describes.

function toDbAccent(accent: CoverAccent): string {
  return accent.replace("--color-", "");
}
function fromDbAccent(accent: string): CoverAccent {
  return `--color-${accent}` as CoverAccent;
}

export interface DbCourse {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  coverAccent: CoverAccent;
}

export interface DbLessonForEdit {
  id: string;
  title: string;
  contentType: ContentType;
  published: boolean;
  bodyText: string;
  externalUrl: string;
  youtubeId: string;
  sortOrder: number;
}

export interface DbModuleForEdit {
  id: string;
  title: string;
  sortOrder: number;
  lessons: DbLessonForEdit[];
}

export async function insertCourse(input: {
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  coverAccent: CoverAccent;
  ownerId: string;
}): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title,
      description: input.description,
      status: input.status,
      cover_accent: toDbAccent(input.coverAccent),
      owner_id: input.ownerId,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function updateCourseFields(
  id: string,
  patch: Partial<{ title: string; description: string; status: string; coverAccent: CoverAccent }>,
): Promise<void> {
  if (!supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.coverAccent !== undefined) dbPatch.cover_accent = toDbAccent(patch.coverAccent);
  await supabase.from("courses").update(dbPatch).eq("id", id);
}

export async function fetchCourseForEdit(courseId: string): Promise<{ course: DbCourse; modules: DbModuleForEdit[] } | null> {
  if (!supabase) return null;
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description, status, cover_accent")
    .eq("id", courseId)
    .single();
  if (courseError || !course) return null;

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id, title, sort_order, lessons(id, title, content_type, published, body_text, external_url, youtube_id, sort_order)")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (modulesError || !modules) return null;

  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      status: course.status,
      coverAccent: fromDbAccent(course.cover_accent),
    },
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      sortOrder: m.sort_order,
      lessons: (m.lessons as unknown as Array<{
        id: string;
        title: string;
        content_type: ContentType;
        published: boolean;
        body_text: string;
        external_url: string;
        youtube_id: string | null;
        sort_order: number;
      }>)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => ({
          id: l.id,
          title: l.title,
          contentType: l.content_type,
          published: l.published,
          bodyText: l.body_text,
          externalUrl: l.external_url,
          youtubeId: l.youtube_id ?? "",
          sortOrder: l.sort_order,
        })),
    })),
  };
}

export async function insertModule(courseId: string, title: string, sortOrder: number): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("modules").insert({ course_id: courseId, title, sort_order: sortOrder }).select("id").single();
  if (error || !data) return null;
  return data.id;
}

export async function updateModuleFields(id: string, patch: Partial<{ title: string; sortOrder: number }>): Promise<void> {
  if (!supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
  await supabase.from("modules").update(dbPatch).eq("id", id);
}

export async function deleteModuleRow(id: string): Promise<void> {
  await supabase?.from("modules").delete().eq("id", id);
}

export async function insertLesson(
  moduleId: string,
  title: string,
  contentType: ContentType,
  sortOrder: number,
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("lessons")
    .insert({ module_id: moduleId, title, content_type: contentType, sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function updateLessonFields(
  id: string,
  patch: Partial<{
    title: string;
    contentType: ContentType;
    published: boolean;
    bodyText: string;
    externalUrl: string;
    youtubeId: string;
    sortOrder: number;
  }>,
): Promise<void> {
  if (!supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.contentType !== undefined) dbPatch.content_type = patch.contentType;
  if (patch.published !== undefined) dbPatch.published = patch.published;
  if (patch.bodyText !== undefined) dbPatch.body_text = patch.bodyText;
  if (patch.externalUrl !== undefined) dbPatch.external_url = patch.externalUrl;
  if (patch.youtubeId !== undefined) dbPatch.youtube_id = patch.youtubeId || null;
  if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
  await supabase.from("lessons").update(dbPatch).eq("id", id);
}

export async function deleteLessonRow(id: string): Promise<void> {
  await supabase?.from("lessons").delete().eq("id", id);
}

/** Accepts a raw 11-char YouTube video id, a youtube.com/watch?v= URL, or a
 *  youtu.be/ URL, and normalizes to just the id — the same value the
 *  IFrame Player API (and lessons.youtube_id) expects. Returns the input
 *  unchanged if it doesn't look like any of those. */
export function normalizeYouTubeId(input: string): string {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1) || trimmed;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const shortsMatch = url.pathname.match(/\/shorts\/([\w-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }
  } catch {
    // not a URL — fall through and return as-is
  }
  return trimmed;
}
