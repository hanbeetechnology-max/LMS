"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Clock, Bell, Settings, Trophy, Users, MessageSquare, Bot } from "lucide-react";
import styles from "../layout.module.css";
import ModeSwitcher from "./ModeSwitcher";

import { useMode } from "../ModeContext";

const tournamentMenu = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  { name: "My Team", href: "/dashboard/team", icon: Users },
  { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const learningMenu = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Courses", href: "/dashboard/courses", icon: BookOpen },
  { name: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
  { name: "Live Attendance", href: "/dashboard/attendance", icon: Clock },
  { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { mode } = useMode();

  const currentMenu = mode === "tournament" ? tournamentMenu : learningMenu;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        HANBEE <span className={styles.logoHighlight}>LMS×RC</span>
      </div>
      
      <ModeSwitcher />

      <nav className={styles.navMenu}>
        {currentMenu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className={styles.userProfile}>
        <div className={styles.avatar}>A</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Alex Rivera</span>
          <span className={styles.userRole}>Student</span>
        </div>
      </div>
    </aside>
  );
}
