import { AppShell, type NavItem } from "./AppShell";
import {
  AnnouncementIcon,
  AttendanceIcon,
  CoursesIcon,
  DashboardIcon,
  DiscussionIcon,
  EnrollmentIcon,
  MessagingIcon,
  SchedulingIcon,
  TrophyIcon,
} from "../components/landing/icons";

// Local SparklesIcon since it is not in components/landing/icons
function SparklesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/student/dashboard", Icon: DashboardIcon },
  { label: "RC Tournament", to: "/tournament", Icon: TrophyIcon },
  { label: "My Courses", to: "/student/courses", Icon: CoursesIcon },
  { label: "My Enrollments", to: "/student/enrollments", Icon: EnrollmentIcon },
  { label: "My Attendance", to: "/student/attendance", Icon: AttendanceIcon },
  { label: "Calendar", to: "/student/calendar", Icon: SchedulingIcon },
  { label: "Announcements", to: "/student/announcements", Icon: AnnouncementIcon },
  { label: "Discussions", to: "/student/forums", Icon: DiscussionIcon },
  { label: "Messages", to: "/student/messages", Icon: MessagingIcon },
  { label: "AI Assistant", to: "/student/ai", Icon: SparklesIcon },
];

export function StudentLayout() {
  return <AppShell navItems={NAV_ITEMS} settingsPath="/student/settings" />;
}
