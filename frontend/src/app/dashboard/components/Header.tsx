"use client";

import { Search, Bell } from "lucide-react";
import styles from "../layout.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.greeting}>Good morning,</div>
        <div className={styles.greetingName}>Alex Rivera</div>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search..." 
          className={styles.searchInput}
        />
        <div className={styles.shortcut}>⌘K</div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.date}>Thu, Sep 24</div>
        
        <button className={styles.notificationBtn}>
          <Bell size={20} />
          <div className={styles.notificationBadge} />
        </button>

        <div className={styles.headerUser}>
          <div className={styles.avatar}>A</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Student</span>
            <span className={styles.userRole}>Team Apex</span>
          </div>
        </div>
      </div>
    </header>
  );
}
