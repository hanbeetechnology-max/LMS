import { type DragEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { AssessmentEditor } from "../../components/app/AssessmentEditor";
import { CoursesIcon, FileIcon, UploadIcon } from "../../components/landing/icons";
import { useToast } from "../../lib/ToastProvider";
import {
  COVER_ACCENTS,
  getCourseTypeMeta,
  type ContentType,
  type CourseType,
  type CoverAccent,
} from "../../lib/courseTypes";
import {
  deleteLessonRow,
  deleteModuleRow,
  fetchCourseForEdit,
  insertLesson,
  insertModule,
  normalizeYouTubeId,
  updateCourseFields,
  updateLessonFields,
  updateModuleFields,
} from "../../lib/coursesAdminApi";

type CourseStatus = "draft" | "published" | "archived";

interface Material {
  id: string;
  name: string;
  size: number;
  progress: number;
}

type FileAccent = "--color-violet" | "--color-teal" | "--color-amber" | "--color-error" | "--color-slate";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "webm"];
const DOC_EXTENSIONS = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];

function getFileKind(name: string): { label: string; accent: FileAccent } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.includes(ext)) return { label: ext.toUpperCase(), accent: "--color-violet" };
  if (VIDEO_EXTENSIONS.includes(ext)) return { label: ext.toUpperCase(), accent: "--color-teal" };
  if (ext === "pdf") return { label: "PDF", accent: "--color-error" };
  if (DOC_EXTENSIONS.includes(ext)) return { label: ext.toUpperCase(), accent: "--color-amber" };
  return { label: ext ? ext.toUpperCase() : "FILE", accent: "--color-slate" };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Lesson {
  id: string;
  title: string;
  contentType: ContentType;
  published: boolean;
  materials: Material[];
  externalUrl: string;
  bodyText: string;
  youtubeId: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  video: "Video",
  document: "Document",
  slides: "Slides",
  link: "Link",
  text: "Text",
};

const INITIAL_MODULES: Module[] = [
  {
    id: "m1",
    title: "Module 1: Foundations",
    lessons: [
      {
        id: "l1",
        title: "Welcome & syllabus",
        contentType: "text",
        published: true,
        materials: [],
        externalUrl: "",
        bodyText: "Welcome to Intro to Design! Over the next 6 weeks we'll cover color theory, typography, and layout fundamentals.",
        youtubeId: "",
      },
      { id: "l2", title: "Color theory basics", contentType: "video", published: true, materials: [], externalUrl: "", bodyText: "", youtubeId: "_2LLXnUdUIc" },
      { id: "l3", title: "Reading: principles of design", contentType: "document", published: false, materials: [], externalUrl: "", bodyText: "", youtubeId: "" },
    ],
  },
  {
    id: "m2",
    title: "Module 2: Typography",
    lessons: [
      { id: "l4", title: "Type pairing", contentType: "slides", published: true, materials: [], externalUrl: "", bodyText: "", youtubeId: "" },
      {
        id: "l5",
        title: "Further reading",
        contentType: "link",
        published: false,
        materials: [],
        externalUrl: "https://www.interaction-design.org/literature/topics/typography",
        bodyText: "",
        youtubeId: "",
      },
    ],
  },
];

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface NewCourseState {
  isNew: true;
  title: string;
  status: CourseStatus;
  type?: CourseType;
  accent?: CoverAccent;
  seedModule?: { title: string; lesson: { title: string; contentType: ContentType } } | null;
}

function seedModules(seed: NewCourseState["seedModule"]): Module[] {
  if (!seed) return [];
  return [
    {
      id: crypto.randomUUID(),
      title: seed.title,
      lessons: [
        {
          id: crypto.randomUUID(),
          title: seed.lesson.title,
          contentType: seed.lesson.contentType,
          published: false,
          materials: [],
          externalUrl: "",
          bodyText: "",
          youtubeId: "",
        },
      ],
    },
  ];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function StaffCourseEditorPage() {
  const { id } = useParams();
  const location = useLocation();
  const { showToast } = useToast();
  const newCourse = (location.state as NewCourseState | null)?.isNew ? (location.state as NewCourseState) : null;

  // A course reached by a real Supabase uuid (every course created via
  // StaffNewCoursePage from here on) is backed by real persistence — see
  // lib/coursesAdminApi.ts and docs/PLAN.md §10.44 Phase 1. A course reached
  // by one of the legacy fake numeric ids (StaffCoursesPage's still-mock
  // listing) keeps the original local-only editing exactly as before;
  // rewiring that listing to real ids app-wide is separate, already-once-
  // deferred work (see coursesApi.ts's own comment on the same ceiling).
  const isRealCourse = !!id && UUID_RE.test(id);
  const [loading, setLoading] = useState(isRealCourse);

  const [title, setTitle] = useState(newCourse?.title ?? "Intro to Design");
  const [description, setDescription] = useState(
    newCourse ? "" : "A foundational course covering design principles, color, and typography.",
  );
  const [status, setStatus] = useState<CourseStatus>(newCourse?.status ?? "published");
  const [coverAccent, setCoverAccent] = useState<CoverAccent>(newCourse?.accent ?? "--color-violet");
  const [modules, setModules] = useState(() => (newCourse ? seedModules(newCourse.seedModule) : INITIAL_MODULES));
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(() =>
    newCourse ? (modules[0]?.lessons[0]?.id ?? null) : "l2",
  );
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!isRealCourse || !id) return;
    let cancelled = false;
    fetchCourseForEdit(id).then((result) => {
      if (cancelled || !result) return;
      setTitle(result.course.title);
      setDescription(result.course.description);
      setStatus(result.course.status);
      setCoverAccent(result.course.coverAccent);
      setModules(
        result.modules.map((m) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            contentType: l.contentType,
            published: l.published,
            materials: [],
            externalUrl: l.externalUrl,
            bodyText: l.bodyText,
            youtubeId: l.youtubeId,
          })),
        })),
      );
      setSelectedLessonId(result.modules[0]?.lessons[0]?.id ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isRealCourse, id]);

  // Debounced so typing a title/description/body doesn't fire a write per
  // keystroke — this app got burned once already this session by a
  // per-render Supabase write pattern (docs/PLAN.md §10.40's 13k-requests
  // bug), so continuous-typing fields commit ~600ms after the user pauses,
  // not instantly like the discrete toggles/selects below.
  function debouncedPersist(key: string, fn: () => void) {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, 600);
  }

  const selectedLesson = modules.flatMap((m) => m.lessons).find((l) => l.id === selectedLessonId) ?? null;

  function moveModule(index: number, dir: -1 | 1) {
    setModules((prev) => {
      const next = move(prev, index, index + dir);
      if (isRealCourse) next.forEach((m, i) => updateModuleFields(m.id, { sortOrder: i }));
      return next;
    });
  }

  function moveLesson(moduleIndex: number, lessonIndex: number, dir: -1 | 1) {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIndex) return m;
        const lessons = move(m.lessons, lessonIndex, lessonIndex + dir);
        if (isRealCourse) lessons.forEach((l, li) => updateLessonFields(l.id, { sortOrder: li }));
        return { ...m, lessons };
      }),
    );
  }

  async function addModule() {
    const title = `Module ${modules.length + 1}`;
    if (isRealCourse && id) {
      const realId = await insertModule(id, title, modules.length);
      if (!realId) return;
      setModules((prev) => [...prev, { id: realId, title, lessons: [] }]);
      return;
    }
    setModules((prev) => [...prev, { id: crypto.randomUUID(), title, lessons: [] }]);
  }

  async function addLesson(moduleId: string) {
    const module = modules.find((m) => m.id === moduleId);
    if (isRealCourse) {
      const realId = await insertLesson(moduleId, "New lesson", "text", module?.lessons.length ?? 0);
      if (!realId) return;
      const newLesson: Lesson = { id: realId, title: "New lesson", contentType: "text", published: false, materials: [], externalUrl: "", bodyText: "", youtubeId: "" };
      setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m)));
      setSelectedLessonId(realId);
      return;
    }
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      title: "New lesson",
      contentType: "text",
      published: false,
      materials: [],
      externalUrl: "",
      bodyText: "",
      youtubeId: "",
    };
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m)));
    setSelectedLessonId(newLesson.id);
  }

  function updateLesson(id: string, patch: Partial<Lesson>) {
    setModules((prev) => prev.map((m) => ({ ...m, lessons: m.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) })));
  }

  function updateModuleTitle(moduleId: string, title: string) {
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));
    if (isRealCourse) debouncedPersist(`module:${moduleId}:title`, () => updateModuleFields(moduleId, { title }));
  }

  function deleteModule(moduleId: string) {
    const module = modules.find((m) => m.id === moduleId);
    if (module?.lessons.some((l) => l.id === selectedLessonId)) setSelectedLessonId(null);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    if (isRealCourse) deleteModuleRow(moduleId);
    showToast(`Deleted "${module?.title}".`);
  }

  function deleteLesson(lessonId: string) {
    const lesson = modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    if (lessonId === selectedLessonId) setSelectedLessonId(null);
    setModules((prev) => prev.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) })));
    if (isRealCourse) deleteLessonRow(lessonId);
    showToast(`Deleted "${lesson?.title}".`);
  }

  function setMaterialProgress(lessonId: string, materialId: string, progress: number) {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === lessonId
            ? { ...l, materials: l.materials.map((mat) => (mat.id === materialId ? { ...mat, progress } : mat)) }
            : l,
        ),
      })),
    );
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || !selectedLesson) return;
    const lessonId = selectedLesson.id;
    const newMaterials: Material[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      progress: 0,
    }));
    updateLesson(lessonId, { materials: [...selectedLesson.materials, ...newMaterials] });
    // Purely cosmetic upload-progress animation — there's no real backend to
    // upload to yet, but a two-step fill reads as "something is happening"
    // instead of files just teleporting into the list at 100%.
    newMaterials.forEach((material) => {
      setTimeout(() => setMaterialProgress(lessonId, material.id, 65), 120);
      setTimeout(() => setMaterialProgress(lessonId, material.id, 100), 420);
    });
    showToast(`${newMaterials.length} file${newMaterials.length > 1 ? "s" : ""} uploaded.`);
  }

  function removeMaterial(materialId: string) {
    if (!selectedLesson) return;
    updateLesson(selectedLesson.id, { materials: selectedLesson.materials.filter((m) => m.id !== materialId) });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingFiles(false);
    handleFilesSelected(e.dataTransfer.files);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-(--color-mist)">Loading course…</div>
    );
  }

  return (
    <>
      <Seo title={`Edit ${title}`} description="Manage modules, lessons, and materials." path={`/staff/courses/${id}/edit`} />

      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/staff/courses" className="text-sm font-medium text-(--color-slate) hover:text-(--color-ink)">
          ← All courses
        </Link>
        {selectedLesson && (
          <a
            href={`/student/courses/${id}/lessons/${selectedLesson.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-(--color-violet) hover:text-(--color-violet-deep)"
          >
            Preview as student ↗
          </a>
        )}
      </Reveal>

      <Reveal delay={0.03} className="mt-4 rounded-2xl border border-(--color-line) p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center justify-between gap-4 sm:contents">
            <div className="shrink-0 sm:order-1">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ color: `var(${coverAccent})`, background: `color-mix(in oklch, var(${coverAccent}) 14%, transparent)` }}
              >
                <CoursesIcon />
              </span>
              <div className="mt-2 flex gap-1.5">
                {COVER_ACCENTS.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => {
                      setCoverAccent(accent);
                      if (isRealCourse && id) updateCourseFields(id, { coverAccent: accent });
                    }}
                    aria-label={`Use ${accent.replace("--color-", "")} cover accent`}
                    className={`h-4 w-4 rounded-full transition-transform ${coverAccent === accent ? "scale-125 ring-2 ring-offset-1 ring-(--color-ink)" : ""}`}
                    style={{ background: `var(${accent})` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:order-3">
              {/* Only known for courses created via the wizard this session —
                  there's no shared store carrying `type` from StaffCoursesPage
                  for pre-existing courses, same mock-data ceiling as the rest
                  of the app's per-page local state. */}
              {newCourse?.type && (
                <span className="rounded-full bg-(--color-cloud) px-3 py-1.5 text-xs font-medium text-(--color-slate)">
                  {getCourseTypeMeta(newCourse.type).label}
                </span>
              )}
              <select
                value={status}
                onChange={(e) => {
                  const next = e.target.value as CourseStatus;
                  setStatus(next);
                  if (isRealCourse && id) updateCourseFields(id, { status: next });
                }}
                className="rounded-full border border-(--color-line) bg-(--color-paper) px-3 py-1.5 text-xs font-medium capitalize text-(--color-ink-soft) outline-none focus:border-(--color-violet)"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="min-w-0 flex-1 sm:order-2">
            <input
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (isRealCourse && id) debouncedPersist("course:title", () => updateCourseFields(id, { title: next }));
              }}
              className="w-full border-none bg-transparent font-display text-xl font-semibold text-(--color-ink) outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => {
                const next = e.target.value;
                setDescription(next);
                if (isRealCourse && id) debouncedPersist("course:description", () => updateCourseFields(id, { description: next }));
              }}
              rows={2}
              className="mt-1 w-full resize-none border-none bg-transparent text-sm text-(--color-slate) outline-none"
            />
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Reveal delay={0.05} className="flex flex-col gap-4">
          {modules.map((module, mi) => (
            <div key={module.id} className="rounded-2xl border border-(--color-line) p-4">
              <div className="flex items-center gap-2">
                <input
                  value={module.title}
                  onChange={(e) => updateModuleTitle(module.id, e.target.value)}
                  className="flex-1 truncate border-none bg-transparent text-sm font-semibold text-(--color-ink) outline-none"
                />
                <button
                  type="button"
                  onClick={() => moveModule(mi, -1)}
                  disabled={mi === 0}
                  className="text-(--color-mist) hover:text-(--color-ink) disabled:opacity-30"
                  aria-label="Move module up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveModule(mi, 1)}
                  disabled={mi === modules.length - 1}
                  className="text-(--color-mist) hover:text-(--color-ink) disabled:opacity-30"
                  aria-label="Move module down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => deleteModule(module.id)}
                  className="text-(--color-mist) hover:text-(--color-error)"
                  aria-label={`Delete ${module.title}`}
                >
                  ×
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-1">
                {module.lessons.map((lesson, li) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-200 ${
                      lesson.id === selectedLessonId ? "bg-(--color-ink) text-(--color-paper)" : "text-(--color-ink-soft) hover:bg-(--color-cloud)"
                    }`}
                  >
                    <span className="flex-1 truncate">{lesson.title}</span>
                    {!lesson.published && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          lesson.id === selectedLessonId ? "bg-(--color-paper)/20" : "bg-(--color-amber-soft) text-(--color-amber-deep)"
                        }`}
                      >
                        Draft
                      </span>
                    )}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLesson(mi, li, -1);
                      }}
                      className="cursor-pointer opacity-60 hover:opacity-100"
                    >
                      ↑
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLesson(mi, li, 1);
                      }}
                      className="cursor-pointer opacity-60 hover:opacity-100"
                    >
                      ↓
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLesson(lesson.id);
                      }}
                      className="cursor-pointer opacity-60 hover:text-(--color-error) hover:opacity-100"
                      aria-label={`Delete ${lesson.title}`}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addLesson(module.id)}
                className="mt-2 w-full rounded-lg border border-dashed border-(--color-line) py-2 text-xs font-medium text-(--color-slate) transition-colors hover:border-(--color-violet) hover:text-(--color-violet)"
              >
                + Add lesson
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addModule}
            className="w-full rounded-2xl border border-dashed border-(--color-line) py-3 text-sm font-medium text-(--color-slate) transition-colors hover:border-(--color-violet) hover:text-(--color-violet)"
          >
            + Add module
          </button>
        </Reveal>

        <Reveal delay={0.1} className="rounded-2xl border border-(--color-line) p-6">
          {selectedLesson ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <input
                  value={selectedLesson.title}
                  onChange={(e) => {
                    const next = e.target.value;
                    updateLesson(selectedLesson.id, { title: next });
                    if (isRealCourse) debouncedPersist(`lesson:${selectedLesson.id}:title`, () => updateLessonFields(selectedLesson.id, { title: next }));
                  }}
                  className="min-w-0 flex-1 border-none bg-transparent font-display text-lg font-semibold text-(--color-ink) outline-none"
                />
                <button
                  type="button"
                  onClick={() => deleteLesson(selectedLesson.id)}
                  className="shrink-0 text-sm font-medium text-(--color-error) hover:text-(--color-error)/80"
                >
                  Delete
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(Object.keys(CONTENT_TYPE_LABEL) as ContentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      updateLesson(selectedLesson.id, { contentType: type });
                      if (isRealCourse) updateLessonFields(selectedLesson.id, { contentType: type });
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                      selectedLesson.contentType === type
                        ? "bg-(--color-violet) text-(--color-paper)"
                        : "bg-(--color-violet-soft) text-(--color-violet) hover:bg-(--color-violet)/20"
                    }`}
                  >
                    {CONTENT_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm text-(--color-ink-soft)">
                <input
                  type="checkbox"
                  checked={selectedLesson.published}
                  onChange={(e) => {
                    const next = e.target.checked;
                    updateLesson(selectedLesson.id, { published: next });
                    if (isRealCourse) updateLessonFields(selectedLesson.id, { published: next });
                  }}
                  className="h-4 w-4 rounded border-(--color-line) accent-(--color-teal)"
                />
                Published — visible to enrolled students
              </label>

              {selectedLesson.contentType === "video" && (
                <div className="rounded-xl border border-(--color-line) p-4">
                  <label htmlFor="lesson-youtube" className="text-sm font-medium text-(--color-ink)">
                    YouTube video
                  </label>
                  <p className="mt-0.5 text-xs text-(--color-mist)">
                    Paste a video ID or a full youtube.com/youtu.be link — plays in-page, students are never sent to YouTube.
                  </p>
                  <input
                    id="lesson-youtube"
                    value={selectedLesson.youtubeId}
                    onChange={(e) => updateLesson(selectedLesson.id, { youtubeId: e.target.value })}
                    onBlur={(e) => {
                      const normalized = normalizeYouTubeId(e.target.value);
                      updateLesson(selectedLesson.id, { youtubeId: normalized });
                      if (isRealCourse) updateLessonFields(selectedLesson.id, { youtubeId: normalized });
                    }}
                    placeholder="https://youtu.be/… or a raw video ID"
                    className="mt-3 w-full rounded-lg border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
                  />
                </div>
              )}

              <AssessmentEditor lessonId={selectedLesson.id} enabled={selectedLesson.contentType === "video" && isRealCourse} />

              {selectedLesson.contentType === "link" && (
                <div className="rounded-xl border border-(--color-line) p-4">
                  <label htmlFor="lesson-url" className="text-sm font-medium text-(--color-ink)">
                    External link
                  </label>
                  <p className="mt-0.5 text-xs text-(--color-mist)">Students will be sent to this URL.</p>
                  <input
                    id="lesson-url"
                    type="url"
                    value={selectedLesson.externalUrl}
                    onChange={(e) => {
                      const next = e.target.value;
                      updateLesson(selectedLesson.id, { externalUrl: next });
                      if (isRealCourse) debouncedPersist(`lesson:${selectedLesson.id}:externalUrl`, () => updateLessonFields(selectedLesson.id, { externalUrl: next }));
                    }}
                    placeholder="https://example.com/article"
                    className="mt-3 w-full rounded-lg border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
                  />
                </div>
              )}

              {selectedLesson.contentType === "text" && (
                <div className="rounded-xl border border-(--color-line) p-4">
                  <label htmlFor="lesson-body" className="text-sm font-medium text-(--color-ink)">
                    Lesson content
                  </label>
                  <div className="mt-3">
                    <RichTextEditor
                      id="lesson-body"
                      value={selectedLesson.bodyText}
                      onChange={(value) => {
                        updateLesson(selectedLesson.id, { bodyText: value });
                        if (isRealCourse) debouncedPersist(`lesson:${selectedLesson.id}:bodyText`, () => updateLessonFields(selectedLesson.id, { bodyText: value }));
                      }}
                      rows={6}
                      placeholder="Write the lesson content students will read…"
                    />
                  </div>
                </div>
              )}

              {(selectedLesson.contentType === "video" ||
                selectedLesson.contentType === "document" ||
                selectedLesson.contentType === "slides") && (
              <div className="rounded-xl border border-(--color-line) p-4">
                <p className="text-sm font-medium text-(--color-ink)">Materials</p>

                {selectedLesson.materials.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    <AnimatePresence initial={false}>
                      {selectedLesson.materials.map((material) => {
                        const kind = getFileKind(material.name);
                        const uploading = material.progress < 100;
                        return (
                          <motion.li
                            key={material.id}
                            layout
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center gap-3 rounded-lg bg-(--color-cloud) px-3 py-2.5"
                          >
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[9px] font-bold tracking-tight"
                              style={{
                                color: `var(${kind.accent})`,
                                background: `color-mix(in oklch, var(${kind.accent}) 16%, transparent)`,
                              }}
                            >
                              {kind.label.length > 4 ? <FileIcon /> : kind.label}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-(--color-ink-soft)">{material.name}</p>
                              {uploading ? (
                                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-(--color-line)">
                                  <motion.div
                                    className="h-full rounded-full bg-(--color-violet)"
                                    animate={{ width: `${material.progress}%` }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                  />
                                </div>
                              ) : (
                                <p className="text-xs text-(--color-mist)">{formatBytes(material.size)}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMaterial(material.id)}
                              aria-label={`Remove ${material.name}`}
                              className="shrink-0 text-(--color-mist) hover:text-(--color-error)"
                            >
                              ×
                            </button>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                )}

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragLeave={() => setIsDraggingFiles(false)}
                  onDrop={handleDrop}
                  className={`mt-3 flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors duration-200 ${
                    isDraggingFiles
                      ? "border-(--color-violet) bg-(--color-violet-soft)"
                      : "border-(--color-line) hover:border-(--color-violet) hover:bg-(--color-cloud)"
                  }`}
                >
                  <span className={`transition-colors duration-200 ${isDraggingFiles ? "text-(--color-violet)" : "text-(--color-mist)"}`}>
                    <UploadIcon />
                  </span>
                  <p className="text-xs text-(--color-slate)">
                    <span className="font-medium text-(--color-violet)">Click to upload</span> or drag files here
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-(--color-slate)">Select a lesson to edit its content.</p>
          )}
        </Reveal>
      </div>
    </>
  );
}
