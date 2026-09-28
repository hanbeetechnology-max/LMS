"use client";

import styles from "../dashboard.module.css";
import { Trophy, Medal, Star } from "lucide-react";

const leaderboardData = [
  { rank: 1, name: "Team Apex", points: 2450, change: "up", members: 4 },
  { rank: 2, name: "AeroDynamics", points: 2380, change: "same", members: 5 },
  { rank: 3, name: "Velocity RC", points: 2120, change: "up", members: 3 },
  { rank: 4, name: "SkyRiders", points: 1950, change: "down", members: 6 },
  { rank: 5, name: "Mach 5", points: 1840, change: "same", members: 4 },
];

export default function LeaderboardPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Global Leaderboard</h1>
        <p className={styles.pageSubtitle}>See how your team stacks up against the competition</p>
      </div>

      <div className={styles.metricsRow} style={{ marginBottom: "32px" }}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Your Team Rank</span>
            <Trophy size={16} className={styles.metricIcon} style={{ color: "var(--accent)" }} />
          </div>
          <div className={styles.metricValue}>#12</div>
          <div className={styles.metricSubtext}>Top 15% globally</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Total Points</span>
            <Star size={16} className={styles.metricIcon} style={{ color: "#fbbf24" }} />
          </div>
          <div className={styles.metricValue}>1,240</div>
          <div className={styles.metricSubtext}>+350 this week</div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Next Milestone</span>
            <Medal size={16} className={styles.metricIcon} style={{ color: "#9ca3af" }} />
          </div>
          <div className={styles.metricValue}>Silver Tier</div>
          <div className={styles.metricSubtext}>260 points away</div>
        </div>
      </div>

      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: "24px" }}>Top Teams</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {leaderboardData.map((team, index) => (
            <div 
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 24px",
                background: index < 3 ? "var(--bg-card-hover)" : "var(--bg-card)",
                boxShadow: index < 3 ? "var(--clay-shadow-elevated)" : "var(--clay-shadow-outer)",
                borderRadius: "16px",
                gap: "24px"
              }}
            >
              <div style={{ 
                fontSize: "24px", 
                fontWeight: "600", 
                color: index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#b45309" : "var(--text-muted)",
                width: "40px",
                textAlign: "center"
              }}>
                #{team.rank}
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "16px", fontWeight: "500", marginBottom: "4px" }}>{team.name}</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{team.members} members</p>
              </div>
              
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--accent)" }}>
                  {team.points.toLocaleString()} pts
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
