"use client";

import { Pin, AlertTriangle, Info, Calendar as CalendarIcon, Hash } from "lucide-react";
import styles from "./announcements.module.css";

const announcements = [
  {
    author: "Prof. Marcus Reyes",
    role: "Manager",
    time: "2 hours ago",
    target: "RC Race Teams",
    isPinned: true,
    title: "RC Track Maintenance — Schedule Update",
    content: "The main RC F1 circuit will undergo routine track surface maintenance from Sep 24-26. All team time trials scheduled during this window are postponed to Sep 27. Pit lane access will remain open for team setup only.",
    tag: "RC TOURNAMENTS",
    icon: <AlertTriangle size={18} color="#ffb300" />
  },
  {
    author: "Admin Sarah Kwon",
    role: "Staff",
    time: "1 day ago",
    target: "All Students",
    isPinned: false,
    title: "New Course: Advanced PID Control Systems",
    content: "We are excited to announce the launch of 'Advanced PID Control Systems for RC Vehicles' — a 10-week intensive module taught by Dr. James Okafor. Registration opens Oct 1, 2026.",
    tag: "COURSE UPDATES",
    icon: <Info size={18} color="#00f0ff" />
  },
  {
    author: "Prof. Marcus Reyes",
    role: "Manager",
    time: "3 days ago",
    target: "ALL",
    isPinned: false,
    title: "National Day Holiday — Campus Closure",
    content: "Campus and RC facility will be closed on Oct 5, 2026 in observance of National Day. Online coursework and assignments remain accessible. Happy racing week!",
    tag: "HOLIDAYS / CAMPUS",
    icon: <CalendarIcon size={18} color="#9fa8da" />
  },
  {
    author: "Coach Derek Lim",
    role: "Staff",
    time: "5 days ago",
    target: "RC Race Teams",
    isPinned: true,
    title: "Registration Deadline: Hanbee Grand Prix 2026",
    content: "Final deadline to register your team for the Hanbee Grand Prix 2026 is Oct 1. Each team must have 3-5 members and a completed telemetry integration form. Contact the RC office for help.",
    tag: "RC TOURNAMENTS",
    icon: <Hash size={18} color="#ffab91" />
  },
];

export default function AnnouncementsPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Announcements</h1>
        <p className={styles.pageSubtitle}>Staff & manager broadcasts</p>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${styles.tabBtnActive}`}>All</button>
        <button className={styles.tabBtn}>RC Tournaments</button>
        <button className={styles.tabBtn}>Course Updates</button>
        <button className={styles.tabBtn}>Holidays / Campus</button>
      </div>

      <div className={styles.announcementsList}>
        {announcements.map((ann, i) => (
          <div key={i} className={styles.announcementCard}>
            <div className={styles.cardHeader}>
              <div className={`${styles.avatar} ${ann.role === 'Staff' ? styles.avatarStaff : styles.avatarManager}`}>
                {ann.author.charAt(0)}
              </div>
              <div className={styles.authorName}>{ann.author}</div>
              <div className={`${styles.roleBadge} ${ann.role === 'Staff' ? styles.roleStaff : styles.roleManager}`}>
                {ann.role}
              </div>
              <div className={styles.time}>{ann.time} · {ann.target}</div>
              {ann.isPinned && (
                <div className={styles.pinnedBadge}>
                  <Pin size={12} /> PINNED
                </div>
              )}
            </div>
            
            <div className={styles.title}>
              {ann.icon} {ann.title}
            </div>
            <div className={styles.content}>
              {ann.content}
            </div>
            
            <div className={styles.tags}>
              <span className={styles.tag}>{ann.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
