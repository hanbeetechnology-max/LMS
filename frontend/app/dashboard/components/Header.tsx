"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import styles from "../layout.module.css";
import { getAccountProfile, type AccountProfile } from "../../../lib/supabaseAuth";

function roleLabel(role: AccountProfile["role"]) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Header() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    let active = true;
    setToday(new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date()));
    getAccountProfile().then((account) => { if (active) setProfile(account); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const name = profile?.full_name || "Hanbee learner";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <header className={styles.header}>
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
