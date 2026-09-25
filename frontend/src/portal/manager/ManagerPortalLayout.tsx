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
  { label: "Monitor", to: "/manager/monitor", Icon: DashboardIcon },
  { label: "Verifications", to: "/manager/verifications", Icon: EnrollmentIcon },
  { label: "Schools", to: "/manager/schools", Icon: TrophyIcon },
  { label: "Hanbee staff", to: "/manager/staff", Icon: AttendanceIcon },
  { label: "Announcements", to: "/manager/announcements", Icon: AnnouncementIcon },
  { label: "Schedule", to: "/manager/schedule", Icon: SchedulingIcon },
  { label: "Tasks", to: "/manager/tasks", Icon: SchedulingIcon },
  { label: "Chat", to: "/manager/chat", Icon: MessagingIcon },
];

export function ManagerPortalLayout() {
  return <AppShell navItems={NAV_ITEMS} settingsPath="/manager/settings" />;
}
