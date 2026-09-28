"use client";

import styles from "../dashboard.module.css";
import Link from "next/link";
import { Users, Plus, Shield, Zap } from "lucide-react";

export default function MyTeamPage() {
  const hasTeam = false; // Simulating no team yet to show the CTA

  if (!hasTeam) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>My Team</h1>
          <p className={styles.pageSubtitle}>Join forces with others or start your own racing legacy</p>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
          background: "var(--bg-card)",
          boxShadow: "var(--clay-shadow-outer)",
          borderRadius: "24px",
          textAlign: "center"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            background: "var(--bg-card-hover)",
            boxShadow: "var(--clay-shadow-elevated)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
            color: "var(--accent)"
          }}>
            <Users size={32} />
          </div>
          
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "12px" }}>You haven't joined a team yet</h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "400px", marginBottom: "32px", lineHeight: "1.6" }}>
            Racing is a team sport. Create your own team to recruit members, set your colors, and compete in the global leaderboard!
          </p>

          <div style={{ display: "flex", gap: "16px" }}>
            <Link 
              href="/dashboard/team/start"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 28px",
                background: "var(--accent)",
                color: "#ffffff",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)"
              }}
            >
              <Plus size={18} />
              Start a New Team
            </Link>
            
            <button style={{
              padding: "14px 28px",
              background: "var(--bg-card)",
              boxShadow: "var(--clay-shadow-button)",
              color: "var(--text-main)",
              borderRadius: "12px",
              border: "none",
              fontWeight: "600",
              cursor: "pointer"
            }}>
              Browse Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Real team content goes here once joined */}
    </div>
  );
}
