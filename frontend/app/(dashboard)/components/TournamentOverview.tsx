"use client";

import { useState } from "react";
import { Timer, Flag, Trophy, Target, ChevronRight } from "lucide-react";
import styles from "../dashboard.module.css";

const tableData = [
  { name: "Hanbee Grand Prix 2026", format: "TEAM", telemetry: "00:41.284s", position: "#2", status: "UPCOMING" },
  { name: "Autonomous RC Drag Sprint", format: "SOLO", telemetry: "00:43.112s", position: "#5", status: "COMPLETED" },
  { name: "National RC Championship", format: "TEAM", telemetry: "00:40.998s", position: "#3", status: "COMPLETED" },
  { name: "Hanbee Invitational 2025", format: "SOLO", telemetry: "00:42.450s", position: "#4", status: "COMPLETED" },
  { name: "RC Sprint Series Qualifiers", format: "TEAM", telemetry: "—", position: "—", status: "UPCOMING" },
];

export default function TournamentOverview() {
  const [filter, setFilter] = useState("ALL");

  const filteredData = tableData.filter(row => {
    if (filter === "ALL") return true;
    return row.format === filter;
  });

  const handleActionClick = (action: string) => {
    alert(`Opening ${action}...`);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Overview</h1>
        <p className={styles.pageSubtitle}>Tournament performance & quick actions</p>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Fastest Lap Time</span>
            <Timer size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>00:41.284s</div>
          <div className={styles.metricSubtext}>↓ 0.3s from last race</div>
          <div className={styles.sparkline}>
            {[40, 55, 30, 70, 85, 60, 45].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'var(--text-main)' } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Total Participations</span>
            <Flag size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>12</div>
          <div className={styles.metricSubtext}>Competitions entered</div>
          <div className={styles.sparkline}>
            {[20, 30, 25, 45, 60, 80, 100].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'var(--text-muted)' } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Global Rank</span>
            <Trophy size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>#42</div>
          <div className={styles.metricSubtext}>Top 5% worldwide</div>
          <div className={styles.sparkline}>
            {[100, 95, 80, 75, 60, 50, 42].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${100 - h}%`, '--bar-color': 'var(--text-main)' } as React.CSSProperties} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent & Upcoming</h2>
              <div className={styles.filterGroup}>
                <button 
                  className={`${styles.filterBtn} ${filter === 'ALL' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilter('ALL')}
                >All</button>
                <button 
                  className={`${styles.filterBtn} ${filter === 'TEAM' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilter('TEAM')}
                >Team</button>
                <button 
                  className={`${styles.filterBtn} ${filter === 'SOLO' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilter('SOLO')}
                >Solo</button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Competition</th>
                    <th>Format</th>
                    <th>Telemetry</th>
                    <th>Position</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={index}>
                      <td className={styles.cellHighlight}>{row.name}</td>
                      <td>
                        <span className={styles.badgeSolid}>{row.format}</span>
                      </td>
                      <td className={styles.cellMonospace}>{row.telemetry}</td>
                      <td>{row.position}</td>
                      <td>
                        <span className={`${styles.statusPill} ${row.status === 'UPCOMING' ? styles.statusWarning : styles.statusSuccess}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionList}>
              <button className={styles.actionBtn} onClick={() => handleActionClick("Register Team")}>
                <div className={styles.actionIcon}><Target size={20} /></div>
                <div className={styles.actionText}>
                  <strong>Register Team</strong>
                  <span>Join an upcoming tournament</span>
                </div>
                <ChevronRight size={16} />
              </button>
              
              <button className={styles.actionBtn} onClick={() => handleActionClick("View Telemetry")}>
                <div className={styles.actionIcon}><Timer size={20} /></div>
                <div className={styles.actionText}>
                  <strong>View Telemetry</strong>
                  <span>Analyze your latest runs</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
