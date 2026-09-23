import { AppShell, type NavItem } from "./AppShell";
import { DashboardIcon, EnrollmentIcon, SchedulingIcon, AttendanceIcon } from "../components/landing/icons";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/manager/dashboard", Icon: DashboardIcon },
  { label: "Verifications", to: "/manager/verifications", Icon: EnrollmentIcon },
  { label: "Holidays", to: "/manager/holidays", Icon: SchedulingIcon },
  { label: "Staff", to: "/manager/staff", Icon: AttendanceIcon },
];

export function ManagerLayout() {
  return <AppShell navItems={NAV_ITEMS} settingsPath="/manager/settings" />;
}
