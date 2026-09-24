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
  { label: "Overview", to: "/school/overview", Icon: DashboardIcon },
  { label: "Students", to: "/school/students", Icon: EnrollmentIcon },
  { label: "Teams", to: "/school/teams", Icon: TrophyIcon },
  { label: "Announcements", to: "/school/announcements", Icon: AnnouncementIcon },
  { label: "Schedule", to: "/school/schedule", Icon: SchedulingIcon },
  { label: "Chat", to: "/school/chat", Icon: MessagingIcon },
  { label: "Courses", to: "/school/courses", Icon: CoursesIcon },
];

export function SchoolLayout() {
  return <AppShell navItems={NAV_ITEMS} settingsPath="/school/settings" />;
}
