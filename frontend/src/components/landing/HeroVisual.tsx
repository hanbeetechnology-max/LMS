import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { AnnouncementIcon, AttendanceIcon, CoursesIcon, EnrollmentIcon, MessagingIcon, SchedulingIcon } from "./icons";

const BARS = [38, 62, 45, 80, 58, 90, 70];
const ROTATE_MS = 4200;

function CoursesScreen() {
  const rows = [
    { title: "Intro to Design — Section B", meta: "6 modules · 72% complete" },
    { title: "Data Structures", meta: "8 modules · 45% complete" },
    { title: "UX Writing Basics", meta: "4 modules · not started" },
  ];
  return (
    <div className="space-y-3">
      <p className="font-display text-sm font-semibold text-(--color-ink)">Your courses</p>
      {rows.map((row) => (
        <div key={row.title} className="flex items-center gap-3 rounded-xl border border-(--color-line) p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-violet-soft) text-(--color-violet)">
            <CoursesIcon />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-(--color-ink)">{row.title}</p>
            <p className="text-xs text-(--color-mist)">{row.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EnrollmentScreen() {
  const rows = [
    { name: "Ava Chen", status: "Present" },
    { name: "Liam Cole", status: "Present" },
    { name: "Noah Reyes", status: "Late" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-(--color-ink)">Section B — roster</p>
        <span className="font-mono text-[11px] text-(--color-teal-deep)">24 enrolled</span>
      </div>
      <div className="rounded-xl border border-(--color-line) p-3">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-(--color-ink-soft)">{row.name}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                row.status === "Present" ? "bg-(--color-teal-soft) text-(--color-teal-deep)" : "bg-(--color-amber-soft) text-(--color-amber-deep)"
              }`}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-(--color-line) p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-amber-soft) text-(--color-amber)">
          <AttendanceIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-(--color-ink)">3 invites pending</p>
          <p className="text-xs text-(--color-mist)">Sent Monday</p>
        </div>
      </div>
    </div>
  );
}

function SchedulingScreen() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-(--color-ink)">This week's attendance</p>
          <span className="font-mono text-[11px] text-(--color-teal-deep)">+8%</span>
        </div>
        <div className="mt-4 flex h-28 items-end gap-2">
          {BARS.map((h, i) => (
            <motion.span
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: `${h}%`, transformOrigin: "bottom" }}
              className="flex-1 rounded-sm bg-(--color-violet)/70 first:bg-(--color-violet)"
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-(--color-line) p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-amber-soft) text-(--color-amber)">
          <SchedulingIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-(--color-ink)">Office hours — Thu, 3:00 PM</p>
          <p className="text-xs text-(--color-mist)">Next scheduled session</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-(--color-line) p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-violet-soft) text-(--color-violet)">
          <AnnouncementIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-(--color-ink)">New announcement posted</p>
          <p className="text-xs text-(--color-mist)">Assignment materials updated</p>
        </div>
      </div>
    </div>
  );
}

function MessagingScreen() {
  return (
    <div className="flex flex-col">
      <p className="mb-4 font-display text-sm font-semibold text-(--color-ink)">Section B — messages</p>
      <div className="space-y-2.5">
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-(--color-cloud) px-3.5 py-2.5 text-sm text-(--color-ink-soft)">
          Reminder: office hours moved to 3pm Thursday.
        </div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-(--color-ink) px-3.5 py-2.5 text-sm text-(--color-paper)">
          Got it, thank you!
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-(--color-cloud) px-3.5 py-2.5 text-sm text-(--color-ink-soft)">
          See you then 👋
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-full border border-(--color-line) px-4 py-2.5 text-xs text-(--color-mist)">
        <MessagingIcon />
        Message Section B…
      </div>
    </div>
  );
}

const SCREENS = [
  { key: "courses", Icon: CoursesIcon, Screen: CoursesScreen },
  { key: "enrollment", Icon: EnrollmentIcon, Screen: EnrollmentScreen },
  { key: "scheduling", Icon: SchedulingIcon, Screen: SchedulingScreen },
  { key: "messaging", Icon: MessagingIcon, Screen: MessagingScreen },
];

export function HeroVisual() {
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SCREENS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  const ActiveScreen = SCREENS[active].Screen;

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28, scale: shouldReduceMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-lg lg:mx-0 lg:mt-[40px]"
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 40% 20%, oklch(0.55 0.21 288 / 0.22), transparent 65%), radial-gradient(ellipse 50% 50% at 80% 80%, oklch(0.72 0.13 175 / 0.2), transparent 65%)",
        }}
      />

      {/* App frame */}
      <div className="overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-paper) shadow-[0_30px_70px_-30px_rgba(20,20,30,0.35)]">
        <div className="flex items-center gap-2 border-b border-(--color-line) bg-(--color-cloud) px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-amber)" />
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-teal)" />
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-violet)" />
          <span className="ml-3 font-mono text-[11px] tracking-tight text-(--color-mist)">
            hanbeelms.app/dashboard
          </span>
        </div>

        <div className="flex">
          <div className="flex flex-col items-center gap-5 border-r border-(--color-line) px-3 py-8">
            {SCREENS.map(({ key, Icon }, i) => (
              <button
                key={key}
                type="button"
                tabIndex={-1}
                onClick={() => setActive(i)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-300 ${
                  i === active ? "bg-(--color-ink) text-(--color-paper)" : "text-(--color-mist)"
                }`}
              >
                <Icon />
              </button>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden p-6" style={{ height: 360 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={SCREENS[active].key}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex h-full flex-col justify-center"
              >
                <ActiveScreen />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, y: 16, x: -10 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.5, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -left-6 -top-8 flex items-center gap-2 rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 shadow-[0_15px_35px_-15px_rgba(20,20,30,0.3)] sm:-left-10 sm:-top-10"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-amber-soft) text-(--color-amber)">
          <AttendanceIcon />
        </span>
        <div>
          <p className="text-xs font-semibold text-(--color-ink)">Attendance marked</p>
          <p className="text-[11px] text-(--color-mist)">Just now</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -right-6 bottom-10 flex items-center gap-2 rounded-xl border border-(--color-line) bg-(--color-ink-fixed) px-4 py-2.5 text-(--color-paper-fixed) shadow-[0_15px_35px_-15px_rgba(20,20,30,0.45)] sm:-right-10"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--color-teal) opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-(--color-teal)" />
        </span>
        <p className="text-xs font-semibold">48 students online</p>
      </motion.div>
    </motion.div>
  );
}
