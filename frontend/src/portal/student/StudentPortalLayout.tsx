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
  { label: "Tournament", to: "/student/rc", Icon: TrophyIcon },
  { label: "Leaderboard", to: "/student/rc/leaderboard", Icon: DashboardIcon },
  { label: "My team", to: "/student/rc/team", Icon: EnrollmentIcon },
  { label: "Learning", to: "/student/lms", Icon: CoursesIcon },
  { label: "Announcements", to: "/student/announcements", Icon: AnnouncementIcon },
  { label: "Chat", to: "/student/chat", Icon: MessagingIcon },
];

export function StudentPortalLayout() {
  return <AppShell navItems={NAV_ITEMS} settingsPath="/student/settings" />;
}
