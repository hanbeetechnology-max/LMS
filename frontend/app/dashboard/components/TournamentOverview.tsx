"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Trophy, Users } from "lucide-react";
import Link from "next/link";
import styles from "../dashboard.module.css";
import { fetchUpcomingTournament, fetchMyTeamFormation, type MyTeamFormation, type UpcomingTournament } from "../../../lib/teamFormationApi";
import { getAccountProfile } from "../../../lib/supabaseAuth";

export default function TournamentOverview() {
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [team, setTeam] = useState<MyTeamFormation["my_team"]>(null);
  const [teamHref, setTeamHref] = useState("/dashboard/team");
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadOverview() {
      try {
        const [event, profile] = await Promise.all([fetchUpcomingTournament(), getAccountProfile()]);
        if (!active) return;
        setTournament(event);
        if (profile.role === "student") setCanManageTeam(true);
        if (profile.role === "school_staff") {
          setTeamHref("/dashboard/school/teams");
          setCanManageTeam(true);
        }
        if (event && profile.role === "student") {
          const formation = await fetchMyTeamFormation(event.id);
          if (active) setTeam(formation.my_team);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tournament information.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadOverview();
    return () => { active = false; };
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Overview</h1>
        <p className={styles.pageSubtitle}>Upcoming Hanbee events and your team status</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading tournament information…</p> : tournament ? (
        <section className={styles.sectionCard} style={{ marginBottom: 28 }}>
          <span className={styles.metricLabel}>NEXT TOURNAMENT</span>
          <h2 style={{ fontSize: 24, fontWeight: 500, marginTop: 8 }}>{tournament.title}</h2>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 14, color: "var(--text-muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><CalendarDays size={16} />{new Date(tournament.starts_at).toLocaleString()}</span>
            {tournament.venue && <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><MapPin size={16} />{tournament.venue}</span>}
          </div>
          {team && <p style={{ marginTop: 18 }}>Your team: <strong>{team.name}</strong> · {team.status.replaceAll("_", " ")}</p>}
          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            {canManageTeam && <Link href={teamHref} className={styles.actionBtn} style={{ textDecoration: "none" }}>{team ? "Manage team" : "Team registration"}</Link>}
            <Link href="/dashboard/leaderboard" className={styles.actionBtn} style={{ textDecoration: "none" }}>View results</Link>
          </div>
        </section>
      ) : (
        <section className={styles.sectionCard} style={{ marginBottom: 28 }}>
          <h2 className={styles.sectionTitle}>No upcoming tournament</h2>
          <p style={{ marginTop: 8, color: "var(--text-muted)" }}>New events will appear here when they are published.</p>
          <Link href="/dashboard/leaderboard" style={{ display: "inline-block", marginTop: 16, color: "var(--text-main)" }}>See published results</Link>
        </section>
      )}

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Tournament</span><Trophy size={16} className={styles.metricIcon} /></div>
          <div className={styles.metricValue} style={{ fontSize: 20 }}>{loading ? "—" : tournament ? "Upcoming" : "None"}</div>
          <div className={styles.metricSubtext}>Current event status</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Team Status</span><Users size={16} className={styles.metricIcon} /></div>
          <div className={styles.metricValue} style={{ fontSize: 20 }}>{loading ? "—" : team ? team.status.replaceAll("_", " ") : "No team"}</div>
          <div className={styles.metricSubtext}>{team ? `${team.members.length} members` : "Create or join a team"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Team size</span><Users size={16} className={styles.metricIcon} /></div>
          <div className={styles.metricValue} style={{ fontSize: 20 }}>{loading ? "—" : tournament ? tournament.team_size : "—"}</div>
          <div className={styles.metricSubtext}>Members required per team</div>
        </div>
      </div>
    </div>
  );
}
