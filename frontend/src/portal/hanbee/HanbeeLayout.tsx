import { AppShell, type NavItem } from "../../layouts/AppShell";
import {
  AnnouncementIcon,
  AttendanceIcon,
  CoursesIcon,
  DashboardIcon,
  EnrollmentIcon,
  MessagingIcon,
  SchedulingIcon,
  TrophyIcon,
} from "../../components/landing/icons";

// Icons are shared placeholders; pick better ones if a screen needs them.
void [AttendanceIcon, CoursesIcon, EnrollmentIcon, TrophyIcon];

const NAV_ITEMS: NavItem[] = [
  { label: "My space", to: "/staff/my-space", Icon: DashboardIcon },
  { label: "Tournament", to: "/staff/tournament", Icon: TrophyIcon },
  { label: "LMS", to: "/staff/lms", Icon: CoursesIcon },
  { label: "Schools", to: "/staff/schools", Icon: EnrollmentIcon },
  { label: "Courses", to: "/staff/courses", Icon: CoursesIcon },
  { label: "Applications", to: "/staff/applications", Icon: AttendanceIcon },
  { label: "Announcements", to: "/staff/announcements", Icon: AnnouncementIcon },
  { label: "Schedule", to: "/staff/schedule", Icon: SchedulingIcon },
  { label: "Tasks", to: "/staff/tasks", Icon: SchedulingIcon },
  { label: "Chat", to: "/staff/chat", Icon: MessagingIcon },
];

export function HanbeeLayout() {
  return <AppShell navItems={NAV_ITEMS} settingsPath="/staff/settings" />;
}
