"use client";

import { Play, Square } from "lucide-react";
import { useState, useEffect } from "react";
import styles from "./attendance.module.css";

const history = [
  { date: "Sep 23, 2026", checkIn: "08:02 AM", checkOut: "05:14 PM", hours: "9h 12m", status: "PRESENT" },
  { date: "Sep 22, 2026", checkIn: "08:47 AM", checkOut: "05:00 PM", hours: "8h 13m", status: "LATE" },
  { date: "Sep 21, 2026", checkIn: "07:58 AM", checkOut: "04:30 PM", hours: "8h 32m", status: "PRESENT" },
  { date: "Sep 20, 2026", checkIn: "08:05 AM", checkOut: "06:00 PM", hours: "9h 55m", status: "NO PIT DUTY" },
  { date: "Sep 19, 2026", checkIn: "08:00 AM", checkOut: "05:00 PM", hours: "9h 00m", status: "PRESENT" },
];

export default function AttendancePage() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = hours.toString().padStart(2, '0');
    return { strHours, minutes, seconds, ampm };
  };

  const { strHours, minutes, seconds, ampm } = formatTime(time);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Live Attendance</h1>
        <p className={styles.pageSubtitle}>Real-time clock-in and attendance history</p>
      </div>

      <div className={styles.clockPanel}>
        <div className={styles.timeDisplay}>
          {strHours}<span>:</span>{minutes}<span>:</span>{seconds} <small>{ampm}</small>
        </div>
        
        <div className={styles.clockAction}>
          <div className={styles.statusIndicator}>
            <div 
              className={styles.statusDot} 
              style={{ backgroundColor: isClockedIn ? '#00ff80' : 'var(--text-muted)', boxShadow: isClockedIn ? '0 0 10px #00ff80' : 'none' }}
            />
            Status: {isClockedIn ? 'Checked In' : 'Checked Out'}
          </div>
          <button 
            className={styles.clockInBtn}
            onClick={() => setIsClockedIn(!isClockedIn)}
            style={{ 
              backgroundColor: isClockedIn ? 'rgba(255, 68, 68, 0.1)' : 'var(--bg-card)',
              borderColor: isClockedIn ? 'rgba(255, 68, 68, 0.3)' : 'var(--border-subtle)',
              color: isClockedIn ? '#ff4444' : 'var(--text-main)'
            }}
          >
            {isClockedIn ? (
              <><Square size={20} fill="currentColor" /> CLOCK OUT</>
            ) : (
              <><Play size={20} fill="currentColor" /> CLOCK IN</>
            )}
          </button>
        </div>
      </div>

      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Attendance History</h2>
        
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Total Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) => (
              <tr key={i}>
                <td>{row.date}</td>
                <td style={{ fontFamily: 'monospace' }}>{row.checkIn}</td>
                <td style={{ fontFamily: 'monospace' }}>{row.checkOut}</td>
                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{row.hours}</td>
                <td>
                  <span className={`${styles.badge} ${
                    row.status === 'PRESENT' ? styles.badgePresent :
                    row.status === 'LATE' ? styles.badgeLate : styles.badgeNoPitDuty
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
