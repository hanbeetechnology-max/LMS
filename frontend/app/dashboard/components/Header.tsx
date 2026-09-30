"use client";

import { useEffect, useState } from "react";
import { Search, Menu, X } from "lucide-react";
import styles from "../layout.module.css";
import type { AccountProfile } from "../../../lib/supabaseAuth";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

function roleLabel(role: AccountProfile["role"]) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Header({ onMenuClick, menuOpen }: { onMenuClick: () => void; menuOpen: boolean }) {
  const { data: profile } = useSessionProfile();
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date()));
  }, []);

  const name = profile?.full_name || "Hanbee learner";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.hamburgerBtn}
        onClick={onMenuClick}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className={styles.headerLeft}>
        <div className={styles.greeting}>Welcome back,</div>
        <div className={styles.greetingName}>{profile?.full_name ?? ""}</div>
      </div>
      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input type="search" placeholder="Search..." className={styles.searchInput} aria-label="Search Hanbee" />
      </div>
      <div className={styles.headerRight}>
        <div className={styles.date}>{today}</div>
        <div className={styles.headerUser}>
          <div className={styles.avatar}>{initials || "H"}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{name}</span>
            <span className={styles.userRole}>{profile ? roleLabel(profile.role) : ""}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
