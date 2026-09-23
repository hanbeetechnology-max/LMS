import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { useAuth } from "../../lib/AuthProvider";
import {
  AnnouncementIcon,
  AttendanceIcon,
  CoursesIcon,
  MessagingIcon,
  SchedulingIcon,
  TrophyIcon,
} from "../../components/landing/icons";

interface CourseProgress {
  id: string;
  title: string;
  meta: string;
  progress: number;
}

const INITIAL_COURSES: CourseProgress[] = [
  { id: "1", title: "Intro to Design", meta: "Section B", progress: 72 },
  { id: "2", title: "Data Structures", meta: "Section A", progress: 45 },
  { id: "3", title: "UX Writing Basics", meta: "Not started", progress: 0 },
];

const QUICK_ACTIONS = [
  { label: "Browse courses", to: "/student/courses", Icon: CoursesIcon },
  { label: "View attendance", to: "/student/attendance", Icon: AttendanceIcon },
  { label: "Message instructor", to: "/student/messages", Icon: MessagingIcon },
  { label: "Calendar", to: "/student/calendar", Icon: SchedulingIcon },
] as const;

const ANNOUNCEMENTS = [
  { text: "Assignment materials updated", meta: "Intro to Design — 2 days ago", pinned: true },
  { text: "Midterm review session added", meta: "Data Structures — 5 days ago", pinned: false },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function StudentDashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.fullName.split(" ")[0];

  const [courses] = useState<CourseProgress[]>(INITIAL_COURSES);

  return (
    <>
      <Seo title="Student Dashboard" description="Your HanbeeLms student dashboard." path="/student/dashboard" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Here's what's next in your courses.</p>
      </Reveal>

      <Reveal delay={0.04} className="mt-6">
        <Link
          to="/tournament"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-(--color-amber)/30 bg-(--color-amber-soft) px-6 py-5 transition-transform duration-300 hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-paper) text-(--color-amber-deep)">
              <TrophyIcon />
            </span>
            <div>
              <p className="font-display text-base font-semibold text-(--color-ink)">HANBEE RC F1 Tournament</p>
              <p className="text-sm text-(--color-ink-soft)">Registration is open — see event details and register.</p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-(--color-amber-deep)">View tournament →</span>
        </Link>
      </Reveal>

      <Reveal delay={0.05} className="mt-6 flex flex-wrap gap-2.5">
        {QUICK_ACTIONS.map(({ label, to, Icon }) => (
          <Link
            key={label}
            to={to}
            className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            <Icon />
            {label}
          </Link>
        ))}
      </Reveal>

      <Reveal delay={0.1} className="mt-8 rounded-2xl border border-(--color-line) bg-(--color-cloud) p-6">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--color-mist)">Continue learning</p>
        <h3 className="mt-2 font-display text-xl font-semibold text-(--color-ink)">
          Intro to Design — Lesson 4: Color Theory
        </h3>
        <div className="mt-4 flex max-w-sm items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-line)">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 0.72 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "left" }}
              className="h-full rounded-full bg-(--color-teal)"
            />
          </div>
          <span className="shrink-0 font-mono text-xs text-(--color-mist)">
            <CountUp value="72%" delay={0.3} />
          </span>
        </div>
        <Link
          to="/student/courses/1/lessons/l2"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
        >
          Continue →
        </Link>
      </Reveal>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-(--color-ink)">Your courses</h3>
          <Link to="/student/courses" className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">
            View all →
          </Link>
        </div>
        <StaggerGroup className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {courses.map((course) => (
            <StaggerItem key={course.id} className="rounded-2xl border border-(--color-line) transition-transform duration-300 hover:-translate-y-1">
              <Link to={`/student/courses/${course.id}/lessons/l1`} className="block p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--color-violet-soft) text-(--color-violet)">
                  <CoursesIcon />
                </span>
                <p className="mt-3 text-sm font-medium text-(--color-ink)">{course.title}</p>
                <p className="mt-1 text-xs text-(--color-mist)">{course.meta}</p>
                {course.progress > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-line)">
                      <div className="h-full rounded-full bg-(--color-teal)" style={{ width: `${course.progress}%` }} />
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-(--color-mist)">{course.progress}%</span>
                  </div>
                )}
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>

      <StaggerGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StaggerItem className="rounded-2xl border border-(--color-line) p-6">
          <Link to="/student/calendar" className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-amber-soft) text-(--color-amber)">
              <SchedulingIcon />
            </span>
            <span className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">View all →</span>
          </Link>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Upcoming</h3>
          <p className="mt-2 text-sm text-(--color-slate)">Intro to Design — Section B, tomorrow 10:00 AM</p>
          <p className="mt-1 text-sm text-(--color-slate)">Office hours, Thursday 3:00 PM</p>
        </StaggerItem>

        <StaggerItem className="rounded-2xl border border-(--color-line) p-6">
          <Link to="/student/messages" className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-violet-soft) text-(--color-violet)">
              <MessagingIcon />
            </span>
            <span className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">View all →</span>
          </Link>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Messages</h3>
          <p className="mt-2 text-sm text-(--color-slate)">1 unread message from your instructor</p>
        </StaggerItem>
      </StaggerGroup>

      <Reveal delay={0.15} className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-(--color-ink)">Recent announcements</h3>
          <Link to="/student/announcements" className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">
            View all →
          </Link>
        </div>
        <StaggerGroup className="mt-4 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
          {ANNOUNCEMENTS.map((item) => (
            <StaggerItem key={item.text} y={12}>
              <Link to="/student/announcements" className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-(--color-cloud)">
                <AnnouncementIcon />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-(--color-ink-soft)">{item.text}</p>
                    {item.pinned && (
                      <span className="rounded-full bg-(--color-amber-soft) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-amber-deep)">
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-(--color-mist)">{item.meta}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Reveal>
    </>
  );
}