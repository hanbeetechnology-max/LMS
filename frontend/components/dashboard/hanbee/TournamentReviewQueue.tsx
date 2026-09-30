"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { decideTournamentApplication, fetchTournamentApplicationQueue, type TournamentApplication } from "../../../lib/teamFormationApi";

export default function TournamentReviewQueue() {
  const [rows, setRows] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { data: profile, isLoading: profileLoading, error: profileError } = useSessionProfile();
  const canReview = profile?.role === "staff" || profile?.role === "manager";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchTournamentApplicationQueue());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't load tournament entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (profileError) { setError(profileError instanceof Error ? profileError.message : "We couldn't load tournament entries."); setLoading(false); return; }
    if (!canReview) { setError("Only Hanbee staff and managers can review tournament entries."); setLoading(false); return; }
    void load();
  }, [profileLoading, profileError, canReview, load]);

  async function decide(row: TournamentApplication, decision: "verified" | "rejected") {
    setBusyId(row.team_id);
    setError("");
    setNotice("");
    try {
      await decideTournamentApplication(row.team_id, decision);
      setNotice(`${row.team_name} ${decision === "verified" ? "verified" : "rejected"}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this entry.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section style={{ marginTop: 28 }}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Tournament entry review</h2>
        <p className={styles.pageSubtitle}>Verify payment declarations and approve school teams or solo entries.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading ? <p role="status">Loading tournament applications…</p> : rows.length === 0 ? <p>No tournament entries are waiting for review.</p> : (
        <div style={{ display: "grid", gap: 14 }}>
          {rows.map((row) => <article key={row.team_id} className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <h3>{row.team_name}</h3>
                <p>{row.tournament_title}</p>
                <p style={{ color: "var(--text-muted)" }}>{row.school_name ?? "Solo entry"} · {row.member_count} player{row.member_count === 1 ? "" : "s"}{row.captain_name ? ` · ${row.captain_name}` : ""}</p>
              </div>
              <div>
                <strong>{row.status.replaceAll("_", " ")}</strong>
                <p>{row.payment_declared ? "Payment declared" : "Payment not declared"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="button" disabled={Boolean(busyId) || !row.payment_declared} onClick={() => void decide(row, "verified")}>{busyId === row.team_id ? "Saving…" : "Verify entry"}</button>
              <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(row, "rejected")}>Reject</button>
            </div>
          </article>)}
        </div>
      )}
      {!loading && error && <button type="button" onClick={() => void load()} style={{ marginTop: 14 }}>Try again</button>}
    </section>
  );
}
