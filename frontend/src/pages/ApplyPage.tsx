import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Seo } from "../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import { TextField } from "../components/ui/TextField";
import { ScanToPayCard } from "../components/ui/ScanToPayCard";
import { Logo } from "../components/landing/Logo";
import { AVAILABLE_COURSES as MOCK_AVAILABLE_COURSES, NEXT_COHORT_LABEL, RECENT_ACTIVITY, TESTIMONIAL, type CourseTeaser } from "../lib/mockApplyContent";
import { fetchPublishedCourses, type DbCourseListRow } from "../lib/coursesApi";

function dbRowToTeaser(row: DbCourseListRow): CourseTeaser {
  return {
    id: row.id,
    title: row.title,
    tagline: row.description || "A HanbeeLms course.",
    format: "Cohort",
    activeStudents: 0,
  };
}

const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

type FieldName = "fullName" | "email";

export function ApplyPage() {
  const [availableCourses, setAvailableCourses] = useState<CourseTeaser[]>(MOCK_AVAILABLE_COURSES);
  const [, setLoadingCourses] = useState(true);
  const [courseId, setCourseId] = useState(MOCK_AVAILABLE_COURSES[0].id);
  const [form, setForm] = useState<FormState>({ fullName: "", email: "", phone: "", message: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchPublishedCourses();
      if (cancelled) return;
      if (rows.length > 0) {
        const teasers = rows.map(dbRowToTeaser);
        setAvailableCourses(teasers);
        setCourseId(teasers[0].id);
      }
      setLoadingCourses(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCourse = availableCourses.find((c) => c.id === courseId) ?? availableCourses[0];

  function validate() {
    const errors: Partial<Record<FieldName, string>> = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.email) errors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!paymentConfirmed) {
      setPaymentError("Please confirm payment via the QR code before applying.");
      return;
    }
    setPaymentError(null);

    setSubmitting(true);
    try {
      // No backend yet (see docs/PLAN.md §6) — this will become an insert into a
      // `course_inquiries` table once Supabase is wired up in Phase 1.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Apply to a course"
        description="Tell us a bit about yourself and which HanbeeLms course you're interested in — we'll follow up with an invite."
        path="/apply"
      />

      <div className="mx-auto max-w-3xl px-6 py-16 lg:px-0">
        <Link to="/" aria-label="HanbeeLms home">
          <Logo />
        </Link>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}
            className="mt-16"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-teal-soft) text-(--color-teal)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
              Thanks — we've got it
            </h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-(--color-slate)">
              We received your interest in <span className="font-medium text-(--color-ink-soft)">{selectedCourse.title}</span>.
              A staff member will follow up at {form.email} with an invite link.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center justify-center rounded-full border border-(--color-line) px-6 py-3 text-sm font-semibold text-(--color-ink-soft) transition-colors duration-300 hover:border-(--color-ink) hover:text-(--color-ink)"
            >
              Back to home
            </Link>
          </motion.div>
        ) : (
          <>
            <Reveal className="mt-12">
              <span className="inline-flex items-center rounded-full bg-(--color-violet-soft) px-3 py-1 text-xs font-medium text-(--color-violet)">
                {NEXT_COHORT_LABEL}
              </span>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-(--color-ink) sm:text-4xl">
                Apply to a course
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-(--color-slate)">
                Tell us a bit about yourself and which course you're interested in. A staff member reviews every
                application and follows up with an invite link — no account needed to apply.
              </p>
            </Reveal>

            <StaggerGroup className="mt-8 flex flex-col gap-2.5 rounded-2xl border border-(--color-line) bg-(--color-cloud) p-5">
              {RECENT_ACTIVITY.map((item) => (
                <StaggerItem key={item.text} y={8} className="flex items-center gap-3 text-sm">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full bg-(--color-teal)"
                    />
                  </span>
                  <span className="text-(--color-ink-soft)">{item.text}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-(--color-mist)">{item.time}</span>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <Reveal delay={0.05} className="mt-10">
              <h2 className="text-sm font-medium text-(--color-ink-soft)">Which course?</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {availableCourses.map((course) => {
                  const selected = course.id === courseId;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setCourseId(course.id)}
                      aria-pressed={selected}
                      className={`rounded-2xl border p-4 text-left transition-colors duration-200 ${
                        selected ? "border-(--color-violet) bg-(--color-violet-soft)" : "border-(--color-line) hover:border-(--color-slate)"
                      }`}
                    >
                      <p className="font-display text-base font-semibold text-(--color-ink)">{course.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-(--color-slate)">{course.tagline}</p>
                      <p className="mt-3 text-xs font-medium text-(--color-mist)">
                        {course.format} · {course.activeStudents} students
                      </p>
                    </button>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={0.08} className="mt-10 rounded-2xl border border-(--color-line) p-5">
              <p className="text-[15px] italic leading-relaxed text-(--color-ink-soft)">"{TESTIMONIAL.quote}"</p>
              <p className="mt-3 text-sm font-medium text-(--color-ink)">
                {TESTIMONIAL.name} <span className="font-normal text-(--color-mist)">· {TESTIMONIAL.role}</span>
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mt-10">
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <TextField
                  label="Full name"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Jordan Lee"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  error={fieldErrors.fullName}
                />
                <TextField
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  error={fieldErrors.email}
                />
                <TextField
                  label="Phone (optional)"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="message" className="text-sm font-medium text-(--color-ink-soft)">
                    Anything you'd like us to know? (optional)
                  </label>
                  <textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    rows={3}
                    className="resize-none rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
                  />
                </div>

                <ScanToPayCard
                  amountLabel="course fee"
                  confirmed={paymentConfirmed}
                  onConfirmedChange={(v) => {
                    setPaymentConfirmed(v);
                    if (v) setPaymentError(null);
                  }}
                />
                {paymentError && (
                  <p role="alert" className="text-sm text-(--color-error)">
                    {paymentError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                >
                  {submitting ? "Sending…" : "Apply now"}
                </button>
              </form>
            </Reveal>
          </>
        )}
      </div>
    </>
  );
}
