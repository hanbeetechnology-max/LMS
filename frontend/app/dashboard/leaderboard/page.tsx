"use client";

import { useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import { Trophy } from "lucide-react";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

type Tournament = { id: string; title: string; ends_at: string };
type Result = { team_id: string; team_name: string; school_name: string | null; rank: number; points: number; notes: string };

export default function LeaderboardPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadLeaderboard() {
      try {
        const events = await authenticatedSupabaseFetch<Tournament[]>("/rest/v1/tournaments?select=id,title,ends_at&status=eq.completed&order=ends_at.desc&limit=1");
        if (events.length === 0) {
          if (active) setTournament(null);
          return;
        }
        const event = events[0];
        const rows = await authenticatedSupabaseFetch<Result[]>("/rest/v1/rpc/get_leaderboard", {
          method: "POST",
          body: JSON.stringify({ p_tournament: event.id }),
        });
        if (!active) return;
        setTournament(event);
        setResults(rows);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the leaderboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadLeaderboard();
    return () => { active = false; };
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Leaderboard</h1>
        <p className={styles.pageSubtitle}>{tournament?.title ?? "Official results from completed Hanbee tournaments"}</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading tournament results…</p>}
      {!loading && !error && (!tournament || results.length === 0) && (
        <div className={styles.sectionCard}><p>No official results have been published yet.</p></div>
      )}
      {!loading && !error && results.length > 0 && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 24 }}>Final standings</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((team, index) => (
              <article key={team.team_id} style={{ display: "flex", alignItems: "center", padding: "16px 24px", background: index < 3 ? "var(--bg-card-hover)" : "var(--bg-card)", boxShadow: index < 3 ? "var(--clay-shadow-elevated)" : "var(--clay-shadow-outer)", borderRadius: 16, gap: 20 }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: index === 0 ? "#fbbf24" : "var(--text-muted)", width: 48, textAlign: "center" }}>#{team.rank}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 500 }}>{team.team_name}</h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{team.school_name ?? "Independent team"}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", fontWeight: 600 }}><Trophy size={16} /> {team.points.toLocaleString()} pts</div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
