import { motion } from "framer-motion";

/**
 * Each path animates itself on mount (initial/animate, not `variants`).
 * Variant-based propagation depends on every ancestor motion component
 * using string variant labels — one ancestor with an object-style
 * `animate` prop anywhere in the chain silently breaks that and leaves
 * the icon stuck invisible. Self-contained animation has no such
 * dependency, so these icons draw in correctly no matter where they're
 * nested (StaggerItem, Reveal, a plain span, or a motion.div with its
 * own local animate object).
 */
const drawTransition = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const };
const drawInitial = { pathLength: 0, opacity: 0 };
const drawAnimate = { pathLength: 1, opacity: 1 };

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CoursesIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M20 5.5c0-.83-.67-1.5-1.5-1.5H12v16h6.5c.83 0 1.5-.67 1.5-1.5v-13Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 4v16" />
    </svg>
  );
}

export function EnrollmentIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M2.5 20c.6-3.3 3.2-5.5 6.5-5.5s5.9 2.2 6.5 5.5" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M16.5 6.2a3 3 0 0 1 0 5.7" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M18 14.6c2.6.6 4.5 2.6 5 5.4" />
    </svg>
  );
}

export function AttendanceIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

export function SchedulingIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4.5 5.5A1.5 1.5 0 0 1 6 4h12a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V5.5Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4.5 9.5h15" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M8 3v3M16 3v3" />
    </svg>
  );
}

export function AnnouncementIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M3 10v4a1 1 0 0 0 1 1h2l1.2 4.4a1 1 0 0 0 1 .6H10l-1-5" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M6 10l11-5.5a.6.6 0 0 1 .9.5v13a.6.6 0 0 1-.9.5L6 14" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M6 10v4" />
    </svg>
  );
}

export function DashboardIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4.5 5.5A1.5 1.5 0 0 1 6 4h4v6.5H4.5V5.5Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M13.5 4H18a1.5 1.5 0 0 1 1.5 1.5v3.5h-6V4Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M13.5 12h6v6.5A1.5 1.5 0 0 1 18 20h-4.5v-8Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4.5 14h6v6H6a1.5 1.5 0 0 1-1.5-1.5V14Z" />
    </svg>
  );
}

export function DiscussionIcon() {
  // A threaded topic list (outlined card + horizontal lines), deliberately
  // NOT a speech-bubble shape — MessagingIcon already owns that silhouette,
  // and the two read as near-identical at sidebar-nav size otherwise.
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M5 5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M8 9h8" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M8 13h8" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M8 17h4.5" />
    </svg>
  );
}

export function MessagingIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4 12a8 8 0 1 1 3.3 6.5L4 20l1.3-3.6A7.96 7.96 0 0 1 4 12Z" />
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={drawTransition}
        d="M9 11.5h.01M12 11.5h.01M15 11.5h.01"
        strokeWidth={2.4}
      />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 15V4" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M7.5 8.5 12 4l4.5 4.5" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M6.5 3.5h7.6L18.5 8v11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M14 3.5V8h4.5" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 7v5.5l4 2" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path
        initial={drawInitial}
        animate={drawAnimate}
        transition={drawTransition}
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
      />
    </svg>
  );
}

export function LaptopIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M5 5.5c0-.83.67-1.5 1.5-1.5h11c.83 0 1.5.67 1.5 1.5v9h-14v-9Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M2.5 17.5h19l-1.2 2.2a1.5 1.5 0 0 1-1.32.8H5.02a1.5 1.5 0 0 1-1.32-.8L2.5 17.5Z" />
    </svg>
  );
}

export function TrophyIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M7 4h10v5.5a5 5 0 0 1-10 0V4Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M7 5.5H4.5a2 2 0 0 0 0 4H6M17 5.5h2.5a2 2 0 0 1 0 4H18" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M12 14.5v3M9 20.5h6M9.5 17.5h5l.5 3h-6l.5-3Z" />
    </svg>
  );
}

export function CertificateIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M4 4.5c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1v-10Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M7.5 8h9M7.5 11.5h5.5" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M9.5 15.5 8.7 21l3.3-1.8 3.3 1.8-.8-5.5" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M6 11c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5v8c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 6 19v-8Z" />
      <motion.path initial={drawInitial} animate={drawAnimate} transition={drawTransition} d="M8.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}
