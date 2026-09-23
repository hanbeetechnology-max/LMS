import { motion } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem } from "../ui/Reveal";
import {
  AnnouncementIcon,
  AttendanceIcon,
  CoursesIcon,
  EnrollmentIcon,
  MessagingIcon,
  SchedulingIcon,
} from "./icons";

const FEATURES = [
  {
    title: "Courses & content",
    desc: "Modules, lessons, video, docs, and slides — organized the way you'd teach in person.",
    span: "lg:col-span-2",
    accent: "--color-violet",
    Icon: CoursesIcon,
  },
  {
    title: "Enrollment & rosters",
    desc: "Invite-only or self-enroll sections with live roster counts.",
    span: "",
    accent: "--color-teal",
    Icon: EnrollmentIcon,
  },
  {
    title: "Attendance",
    desc: "Mark a whole class present in one grid, per scheduled session.",
    span: "",
    accent: "--color-amber",
    Icon: AttendanceIcon,
  },
  {
    title: "Scheduling",
    desc: "A shared calendar of class sessions and office hours, synced to every enrolled student.",
    span: "lg:col-span-2",
    accent: "--color-violet",
    Icon: SchedulingIcon,
  },
  {
    title: "Announcements & forums",
    desc: "Course-scoped announcements and discussion threads staff can moderate.",
    span: "lg:col-span-2",
    accent: "--color-teal",
    Icon: AnnouncementIcon,
  },
  {
    title: "Direct messaging",
    desc: "Staff and students talk 1:1 without leaving the platform.",
    span: "",
    accent: "--color-amber",
    Icon: MessagingIcon,
  },
];

export function Features() {
  return (
    <section id="platform" aria-labelledby="features-heading" className="px-6 py-28 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal direction="left">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">The platform</p>
          <h2 id="features-heading" className="mt-4 max-w-2xl font-display text-4xl font-semibold tracking-tight text-(--color-ink) sm:text-5xl">
            Everything a course needs. Nothing it doesn't.
          </h2>
        </Reveal>

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem
              key={f.title}
              direction="scale"
              className={`group relative overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-paper) p-8 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)] ${f.span}`}
            >
              <motion.div
                aria-hidden="true"
                className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  color: `var(${f.accent})`,
                  background: `color-mix(in oklch, var(${f.accent}) 14%, transparent)`,
                }}
                whileHover={{ scale: 1.1, rotate: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <f.Icon />
              </motion.div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-(--color-ink)">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-(--color-slate) transition-colors duration-300 group-hover:text-(--color-ink-soft)">
                {f.desc}
              </p>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                style={{ background: `var(${f.accent})` }}
              />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
