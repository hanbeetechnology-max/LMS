"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Clock, Bell, Settings, Trophy, Users, MessageSquare, Bot, School, CalendarDays, ClipboardList, UserCheck, LogOut, ClipboardCheck, Activity } from "lucide-react";
import styles from "../layout.module.css";
import ModeSwitcher from "./ModeSwitcher";
import { getAccountProfile, readStoredSession, signOut, type AccountProfile } from "../../../lib/supabaseAuth";
import { useMode } from "../ModeContext";

const studentTournamentMenu = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  { name: "My Team", href: "/dashboard/team", icon: Users },
  { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const studentLearningMenu = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Courses", href: "/dashboard/courses", icon: BookOpen },
  { name: "Certificates", href: "/dashboard/certificate", icon: Trophy },
  { name: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
  { name: "Live Attendance", href: "/dashboard/attendance", icon: Clock },
  { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const schoolMenu = [
  { name: "Overview", href: "/dashboard/school/overview", icon: LayoutDashboard },
  { name: "Students", href: "/dashboard/school/students", icon: Users },
  { name: "Courses", href: "/dashboard/school/courses", icon: BookOpen },
  { name: "Teams", href: "/dashboard/school/teams", icon: Trophy },
  { name: "Schedule", href: "/dashboard/school/schedule", icon: CalendarDays },
  { name: "Announcements", href: "/dashboard/school/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/school/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const staffMenu = [
  { name: "My Space", href: "/dashboard/hanbee/my-space", icon: LayoutDashboard },
  { name: "Learning overview", href: "/dashboard/hanbee/lms", icon: Activity },
  { name: "Schools", href: "/dashboard/hanbee/schools", icon: School },
  { name: "Courses", href: "/dashboard/hanbee/courses", icon: BookOpen },
  { name: "Tournament entries", href: "/dashboard/hanbee/tournament", icon: Trophy },
  { name: "Applications", href: "/dashboard/hanbee/applications", icon: ClipboardList },
  { name: "Quiz reviews", href: "/dashboard/hanbee/assessment-reviews", icon: ClipboardCheck },
  { name: "Schedule", href: "/dashboard/hanbee/schedule", icon: CalendarDays },
  { name: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { name: "Announcements", href: "/dashboard/hanbee/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/hanbee/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const managerMenu = [
  { name: "Overview", href: "/dashboard/manager/monitor", icon: LayoutDashboard },
  { name: "Learning overview", href: "/dashboard/hanbee/lms", icon: Activity },
  { name: "Verifications", href: "/dashboard/manager/verifications", icon: UserCheck },
  { name: "Schools", href: "/dashboard/manager/schools", icon: School },
  { name: "Courses", href: "/dashboard/hanbee/courses", icon: BookOpen },
  { name: "Course applications", href: "/dashboard/hanbee/applications", icon: ClipboardList },
  { name: "Quiz reviews", href: "/dashboard/hanbee/assessment-reviews", icon: ClipboardCheck },
  { name: "Tournament entries", href: "/dashboard/hanbee/tournament", icon: Trophy },
  { name: "Hanbee staff", href: "/dashboard/manager/hanbee-staff", icon: Users },
  { name: "Tasks", href: "/dashboard/manager/tasks", icon: ClipboardList },
  { name: "Schedule", href: "/dashboard/hanbee/schedule", icon: CalendarDays },
  { name: "Announcements", href: "/dashboard/manager/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/manager/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function labelRole(role: AccountProfile["role"]) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Sidebar() {
  const pathname = usePathname();
  const { mode } = useMode();
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    let active = true;
    getAccountProfile().then((account) => { if (active) setProfile(account); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const items = profile?.role === "school_staff"
    ? schoolMenu
    : profile?.role === "staff"
      ? staffMenu
      : profile?.role === "manager"
        ? managerMenu
        : mode === "tournament" ? studentTournamentMenu : studentLearningMenu;
  const displayName = profile?.full_name || "Hanbee account";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  async function handleSignOut() {
    try {
      await signOut(readStoredSession());
    } catch {
      window.localStorage.removeItem("hanbee-auth-session");
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.logo}>HANBEE <span className={styles.logoHighlight}>LMS × RC</span></Link>
      {(!profile || profile.role === "student") && <ModeSwitcher />}
      <nav className={styles.navMenu} aria-label="Dashboard navigation">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`} aria-current={active ? "page" : undefined}><Icon className={styles.navIcon} />{item.name}</Link>;
        })}
      </nav>
      <div className={styles.userProfile}>
        <div className={styles.avatar}>{initials || "H"}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>{profile ? labelRole(profile.role) : ""}</span>
        </div>
      </div>
      <button type="button" className={styles.navLink} onClick={() => void handleSignOut()} style={{ marginTop: 10, border: 0, width: "100%", cursor: "pointer", textAlign: "left" }}><LogOut className={styles.navIcon} />Sign out</button>
    </aside>
  );
}
