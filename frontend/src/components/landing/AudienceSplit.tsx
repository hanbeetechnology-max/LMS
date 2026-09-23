import { Link } from "react-router-dom";
import { Reveal, StaggerGroup, StaggerItem } from "../ui/Reveal";

const STAFF_ITEMS = [
  "Build courses with modules, lessons, video, and slides in a drag-to-reorder editor",
  "Invite students, manage rosters, and track enrollment per section",
  "Mark attendance against a live class calendar in seconds",
  "Post announcements and moderate discussions without leaving the dashboard",
];

const STUDENT_ITEMS = [
  "One dashboard for every enrolled course, no digging through email",
  "Watch, read, and complete lessons at your own pace, tracked automatically",
  "See your schedule and attendance history at a glance",
  "Message instructors and join course discussions directly at Anytime You Want.",
];

export function AudienceSplit() {
  return (
    <section aria-labelledby="audience-heading" className="px-6 py-28 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">Two roles, one system</p>
          <h2 id="audience-heading" className="mt-4 max-w-2xl font-display text-4xl font-semibold tracking-tight text-(--color-ink) sm:text-5xl">
            Designed around how staff teach and students learn
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <Reveal
            direction="left"
            className="group relative overflow-hidden rounded-3xl border border-(--color-line) bg-(--color-ink-fixed) p-10 text-(--color-paper-fixed) transition-transform duration-500 hover:-translate-y-1.5 lg:p-12"
          >
            <article id="for-staff" aria-labelledby="for-staff-heading">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl transition-transform duration-700 group-hover:scale-125"
                style={{ background: "oklch(0.55 0.21 288)" }}
              />
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-(--color-teal-deep)">For Staff</span>
              <h3 id="for-staff-heading" className="mt-4 font-display text-3xl font-semibold tracking-tight">
                A command center for every course you run
              </h3>
              <StaggerGroup className="mt-8 flex flex-col gap-4">
                {STAFF_ITEMS.map((item) => (
                  <StaggerItem key={item} direction="left" className="flex items-start gap-3 text-[15px] leading-relaxed text-(--color-paper-fixed)/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-teal)" aria-hidden="true" />
                    <span>{item}</span>
                  </StaggerItem>
                ))}
              </StaggerGroup>
              <a
                href="#get-started"
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-(--color-paper-fixed) px-6 py-3 text-sm font-semibold text-(--color-ink-fixed) transition-transform duration-300 hover:scale-[1.03]"
              >
                Set up your first course →
              </a>
            </article>
          </Reveal>

          <Reveal
            direction="right"
            className="group relative overflow-hidden rounded-3xl border border-(--color-line) bg-(--color-cloud) p-10 text-(--color-ink) transition-transform duration-500 hover:-translate-y-1.5 lg:p-12"
          >
            <article id="for-students" aria-labelledby="for-students-heading">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl transition-transform duration-700 group-hover:scale-125"
                style={{ background: "oklch(0.72 0.13 175)" }}
              />
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-(--color-violet)">For Students</span>
              <h3 id="for-students-heading" className="mt-4 font-display text-3xl font-semibold tracking-tight">
                One calm home for everything you're learning
              </h3>
              <StaggerGroup className="mt-8 flex flex-col gap-4">
                {STUDENT_ITEMS.map((item) => (
                  <StaggerItem key={item} direction="right" className="flex items-start gap-3 text-[15px] leading-relaxed text-(--color-ink-soft)">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-violet)" aria-hidden="true" />
                    <span>{item}</span>
                  </StaggerItem>
                ))}
              </StaggerGroup>
              <Link
                to="/apply"
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
              >
                Apply to a course →
              </Link>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
