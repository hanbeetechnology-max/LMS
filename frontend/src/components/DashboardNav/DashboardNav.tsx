"use client";

import styles from "./DashboardNav.module.css";

export default function DashboardNav() {
  return (
    <header className={styles.header}>
      <div className={styles.search}>
        <span className={styles.searchIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input type="text" className={styles.searchInput} placeholder="Search courses, skills, or mentors..." />
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className={styles.badge}></span>
        </button>

        <div className={styles.profile}>
          <div className={styles.avatar}>A</div>
          <span className={styles.name}>Alex M.</span>
        </div>
      </div>
    </header>
  );
}
