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
} from "../components/landing/icons";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/staff/dashboard", Icon: DashboardIcon },
  { label: "Courses", to: "/staff/courses", Icon: CoursesIcon },
  { label: "Roster", to: "/staff/roster", Icon: EnrollmentIcon },
  { label: "Attendance", to: "/staff/attendance", Icon: AttendanceIcon },
  { label: "Calendar", to: "/staff/calendar", Icon: SchedulingIcon },
  { label: "Announcements", to: "/staff/announcements", Icon: AnnouncementIcon },
  { label: "Discussions", to: "/staff/forums", Icon: DiscussionIcon },
  { label: "Messages", to: "/staff/messages", Icon: MessagingIcon },
];

export function StaffLayout() {
  return <AppShell navItems={NAV_ITEMS} settingsPath="/staff/settings" />;
}
