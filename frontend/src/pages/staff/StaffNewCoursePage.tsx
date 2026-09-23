import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";
import { CoursesIcon } from "../../components/landing/icons";
import { COURSE_TYPES, COVER_ACCENTS, getCourseTypeMeta, type CourseType, type CoverAccent } from "../../lib/courseTypes";
import { useAuth } from "../../lib/AuthProvider";
import { insertCourse, insertModule, insertLesson } from "../../lib/coursesAdminApi";

type Step = 1 | 2 | 3;
const STEP_LABELS = ["Details", "Type", "First module"];

export function StaffNewCoursePage() {
  const navigate = useNavigate();
  const { profile, authSource } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState<CoverAccent>("--color-violet");
  const [type, setType] = useState<CourseType>("self-paced");
  const [moduleTitle, setModuleTitle] = useState("Module 1");
  const [lessonTitle, setLessonTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const canContinueStep1 = title.trim().length > 0;

  async function createCourse() {
    // Real persistence when Supabase is live (docs/PLAN.md §10.44 Phase 1) —
    // every course created from here on gets a real uuid and survives a
    // refresh. Falls back to the old local-only wizard state when running
    // offline/mock, same as every other Supabase-first feature in this app.
    if (authSource === "supabase" && profile) {
      setCreating(true);
      const courseId = await insertCourse({
        title: title.trim(),
        description: description.trim(),
        status: "draft",
        coverAccent: accent,
        ownerId: profile.id,
      });
      if (courseId) {
        if (lessonTitle.trim()) {
          const moduleId = await insertModule(courseId, moduleTitle.trim() || "Module 1", 0);
          if (moduleId) {
            await insertLesson(moduleId, lessonTitle.trim(), getCourseTypeMeta(type).defaultContentType, 0);
          }
        }
        navigate(`/staff/courses/${courseId}/edit`);
        return;
      }
      setCreating(false);
    }

    const id = crypto.randomUUID();
    const seedModule = lessonTitle.trim()
      ? {
          title: moduleTitle.trim() || "Module 1",
          lesson: { title: lessonTitle.trim(), contentType: getCourseTypeMeta(type).defaultContentType },
        }
      : null;
    navigate(`/staff/courses/${id}/edit`, {
      state: {
        isNew: true,
        title: title.trim(),
        status: "draft",
        type,
        accent,
        seedModule,
      },
    });
  }

  return (
    <>
      <Seo title="New course" description="Create a new course on HanbeeLms." path="/staff/courses/new" />

      <Reveal className="flex items-center justify-between gap-4">
        <Link to="/staff/courses" className="text-sm font-medium text-(--color-slate) hover:text-(--color-ink)">
          ← All courses
        </Link>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--color-mist)">
          Step {step} of 3 · {STEP_LABELS[step - 1]}
        </p>
      </Reveal>

      <div className="mt-4 flex gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i + 1 <= step ? "bg-(--color-violet)" : "bg-(--color-line)"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <Reveal delay={0.05} className="mt-6 rounded-2xl border border-(--color-line) p-6">
          <h1 className="font-display text-xl font-semibold text-(--color-ink)">Course details</h1>
          <p className="mt-1 text-sm text-(--color-slate)">Start with a title and a cover accent.</p>

          <div className="mt-6 flex items-start gap-4">
            <div className="shrink-0">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ color: `var(${accent})`, background: `color-mix(in oklch, var(${accent}) 14%, transparent)` }}
              >
                <CoursesIcon />
              </span>
              <div className="mt-2 flex gap-1.5">
                {COVER_ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAccent(a)}
                    aria-label={`Use ${a.replace("--color-", "")} cover accent`}
                    className={`h-4 w-4 rounded-full transition-transform ${accent === a ? "scale-125 ring-2 ring-offset-1 ring-(--color-ink)" : ""}`}
                    style={{ background: `var(${a})` }}
                  />
                ))}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="course-title" className="text-sm font-medium text-(--color-ink-soft)">
                Title
              </label>
              <input
                id="course-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Intro to Design"
                className="mt-1.5 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
              />
              <label htmlFor="course-description" className="mt-4 block text-sm font-medium text-(--color-ink-soft)">
                Description
              </label>
              <textarea
                id="course-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What will students learn?"
                className="mt-1.5 w-full resize-none rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
              className="rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
            >
              Continue →
            </button>
          </div>
        </Reveal>
      )}

      {step === 2 && (
        <Reveal delay={0.05} className="mt-6 rounded-2xl border border-(--color-line) p-6">
          <h1 className="font-display text-xl font-semibold text-(--color-ink)">Choose a type</h1>
          <p className="mt-1 text-sm text-(--color-slate)">
            This sets a sensible starting structure — everything stays fully editable afterward.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COURSE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200 ${
                  type === t.id ? "border-(--color-violet) bg-(--color-violet-soft)" : "border-(--color-line) hover:border-(--color-violet)"
                }`}
              >
                <span
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-full"
                  style={{ background: `var(${t.accent})`, boxShadow: type === t.id ? `0 0 0 3px var(--color-paper), 0 0 0 4px var(${t.accent})` : "none" }}
                />
                <div>
                  <p className="text-sm font-medium text-(--color-ink)">{t.label}</p>
                  <p className="mt-0.5 text-xs text-(--color-slate)">{t.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-(--color-line) px-6 py-2.5 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink)"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
            >
              Continue →
            </button>
          </div>
        </Reveal>
      )}

      {step === 3 && (
        <Reveal delay={0.05} className="mt-6 rounded-2xl border border-(--color-line) p-6">
          <h1 className="font-display text-xl font-semibold text-(--color-ink)">Add a first module</h1>
          <p className="mt-1 text-sm text-(--color-slate)">
            Optional — skip this and add modules later from the editor.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="module-title" className="text-sm font-medium text-(--color-ink-soft)">
                Module title
              </label>
              <input
                id="module-title"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 focus:border-(--color-violet)"
              />
            </div>
            <div>
              <label htmlFor="lesson-title" className="text-sm font-medium text-(--color-ink-soft)">
                First lesson title
              </label>
              <input
                id="lesson-title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. Welcome & syllabus"
                className="mt-1.5 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
              />
              <p className="mt-1.5 text-xs text-(--color-mist)">
                Content type will start as "{getCourseTypeMeta(type).defaultContentType}" — editable in the course editor.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-full border border-(--color-line) px-6 py-2.5 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink)"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={createCourse}
              disabled={creating}
              className="rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
            >
              {creating ? "Creating…" : "Create course"}
            </button>
          </div>
        </Reveal>
      )}
    </>
  );
}
