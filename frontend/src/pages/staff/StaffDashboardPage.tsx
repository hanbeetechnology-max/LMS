import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { TimeClockWidget } from "../../components/app/TimeClockWidget";
import { TasksWidget } from "../../components/app/TasksWidget";
import { AssessmentReviewPanel } from "../../components/app/AssessmentReviewPanel";
import { TournamentRegistrationsPanel } from "../../components/app/TournamentRegistrationsPanel";
import { useAuth } from "../../lib/AuthProvider";
import {
  AnnouncementIcon,
  AttendanceIcon,
  CoursesIcon,
  EnrollmentIcon,
  MessagingIcon,
  SchedulingIcon,
} from "../../components/landing/icons";

const STATS = [
  ["4", "active courses", "/staff/courses"],
  ["96", "students enrolled", "/staff/roster"],
  ["2", "sessions today", "/staff/calendar"],
  ["3", "pending invites", "/staff/invitations"],
] as const;

const QUICK_ACTIONS = [
  { label: "Take attendance", to: "/staff/attendance", Icon: AttendanceIcon },
  { label: "Post announcement", to: "/staff/announcements", Icon: AnnouncementIcon },
  { label: "Invite students", to: "/staff/invitations", Icon: EnrollmentIcon },
  { label: "New course", to: "/staff/courses/new", Icon: CoursesIcon },
  { label: "Course inquiries", to: "/staff/inquiries", Icon: EnrollmentIcon },
] as const;

type ActivityType = "attendance" | "announcement" | "enrollment" | "scheduling";

const ACTIVITY_ICON: Record<ActivityType, typeof AttendanceIcon> = {
  attendance: AttendanceIcon,
  announcement: AnnouncementIcon,
  enrollment: EnrollmentIcon,
  scheduling: SchedulingIcon,
};

const ACTIVITY: { text: string; time: string; type: ActivityType }[] = [
  { text: "Ava Chen submitted attendance for Section B", time: "12m ago", type: "attendance" },
  { text: "New announcement posted in Intro to Design", time: "1h ago", type: "announcement" },
  { text: "Liam Cole accepted their invite to Data Structures", time: "3h ago", type: "enrollment" },
  { text: "Office hours scheduled for Thursday, 3:00 PM", time: "Yesterday", type: "scheduling" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function StaffDashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.fullName.split(" ")[0];

  return (
    <>
      <Seo title="Staff Dashboard" description="Your HanbeeLms staff dashboard." path="/staff/dashboard" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Here's what's happening across your courses.</p>
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

      <TimeClockWidget />
      <AssessmentReviewPanel />
      <TournamentRegistrationsPanel />

      <Reveal delay={0.1} className="mt-8 grid grid-cols-2 gap-6 border-b border-(--color-line) pb-8 sm:grid-cols-4">
        {STATS.map(([value, label, to], i) => (
          <Link key={label} to={to} className="group">
            <dd className="font-display text-3xl font-semibold text-(--color-ink) transition-colors group-hover:text-(--color-violet)">
              <CountUp value={value} delay={0.2 + i * 0.08} />
            </dd>
            <p className="mt-1 text-sm text-(--color-mist)">{label}</p>
          </Link>
        ))}
      </Reveal>

      <StaggerGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StaggerItem className="rounded-2xl border border-(--color-line) p-6 sm:col-span-2">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-violet-soft) text-(--color-violet)">
              <CoursesIcon />
            </span>
            <Link to="/staff/courses" className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">
              View all →
            </Link>
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Courses needing attention</h3>
          <div className="mt-4 flex flex-col divide-y divide-(--color-line)">
            <Link
              to="/staff/courses/1/edit"
              className="flex items-center justify-between py-3 text-sm transition-colors hover:text-(--color-ink)"
            >
              <span className="text-(--color-ink-soft)">Intro to Design — Section B</span>
              <span className="rounded-full bg-(--color-amber-soft) px-2.5 py-0.5 text-xs font-medium text-(--color-amber-deep)">
                2 lessons unpublished
              </span>
            </Link>
            <Link
              to="/staff/courses/2/edit"
              className="flex items-center justify-between py-3 text-sm transition-colors hover:text-(--color-ink)"
            >
              <span className="text-(--color-ink-soft)">Data Structures</span>
              <span className="rounded-full bg-(--color-error-soft) px-2.5 py-0.5 text-xs font-medium text-(--color-error)">
                No materials uploaded
              </span>
            </Link>
          </div>
        </StaggerItem>

        <StaggerItem className="rounded-2xl border border-(--color-line) p-6">
          <Link to="/staff/calendar" className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-amber-soft) text-(--color-amber)">
              <AttendanceIcon />
            </span>
            <span className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">View all →</span>
          </Link>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Today's sessions</h3>
          <p className="mt-2 text-sm text-(--color-slate)">Intro to Design — Section B, 10:00 AM</p>
          <p className="mt-1 text-sm text-(--color-slate)">Office hours, 3:00 PM</p>
        </StaggerItem>

        <StaggerItem className="rounded-2xl border border-(--color-line) p-6">
          <Link to="/staff/messages" className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-violet-soft) text-(--color-violet)">
              <MessagingIcon />
            </span>
            <span className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">View all →</span>
          </Link>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Unread messages</h3>
          <p className="mt-2 text-sm text-(--color-slate)">3 new messages from students</p>
        </StaggerItem>

        <StaggerItem className="sm:col-span-2">
          <TasksWidget />
        </StaggerItem>

        <StaggerItem className="rounded-2xl border border-(--color-line) p-6 sm:col-span-2">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-teal-soft) text-(--color-teal)">
              <AnnouncementIcon />
            </span>
            <Link to="/staff/announcements" className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">
              View all →
            </Link>
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Recent announcements</h3>
          <div className="mt-4 flex flex-col divide-y divide-(--color-line)">
            <Link to="/staff/announcements" className="block py-3 transition-colors hover:text-(--color-ink)">
              <p className="text-sm font-medium text-(--color-ink-soft)">Assignment materials updated</p>
              <p className="text-xs text-(--color-mist)">Intro to Design — 2 days ago</p>
            </Link>
            <Link to="/staff/announcements" className="block py-3 transition-colors hover:text-(--color-ink)">
              <p className="text-sm font-medium text-(--color-ink-soft)">Midterm review session added</p>
              <p className="text-xs text-(--color-mist)">Data Structures — 5 days ago</p>
            </Link>
          </div>
        </StaggerItem>
      </StaggerGroup>

      <Reveal delay={0.15} className="mt-8">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">Recent activity</h3>
        <StaggerGroup className="mt-4 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
          {ACTIVITY.map((item) => {
            const Icon = ACTIVITY_ICON[item.type];
            return (
              <StaggerItem key={item.text} y={12} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <Icon />
                <span className="ml-3 flex-1 text-(--color-ink-soft)">{item.text}</span>
                <span className="font-mono text-xs text-(--color-mist)">{item.time}</span>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </Reveal>
    </>
  );
}
