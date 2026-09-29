"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../lib/supabaseAuth";

type Review = {
  submission_id: string; student_id: string; student_name: string; student_email: string; school_name: string | null;
  course_id: string; course_title: string; lesson_title: string; assessment_title: string;
  score: number; passed: boolean; status: string; unlocked: boolean;
  submitted_at: string; auto_unlock_at: string; verified_at: string | null;
};

export default function AssessmentReviewQueue() {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    const profile = await getAccountProfile();
    if (profile.role !== "staff" && profile.role !== "manager") throw new Error("Only approved Hanbee staff can review assessments.");
    const submissions = await authenticatedSupabaseFetch<Review[]>("/rest/v1/rpc/list_assessment_reviews", { method: "POST", body: "{}" });
    setRows(submissions);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load assessment reviews."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function verify(row: Review) {
    setBusyId(row.submission_id); setError(""); setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/rpc/verify_assessment_submission", { method: "POST", body: JSON.stringify({ p_submission_id: row.submission_id }) });
      setMessage(`${row.student_name}'s submission is verified and the next lesson is unlocked.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't verify this assessment."); }
    finally { setBusyId(""); }
  }

  const waiting = rows.filter((row) => row.status === "pending" && !row.unlocked);

  return <div>
    <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Quiz reviews</h1><p className={styles.pageSubtitle}>Check quiz scores and verify submissions to unlock the next lesson</p></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {loading ? <p role="status">Loading quiz submissions…</p> : <>
      <div className={styles.metricsRow} style={{ marginBottom: 20 }}>
        <div className={styles.metricCard}><span className={styles.metricLabel}>Waiting for review</span><div className={styles.metricValue}>{waiting.length}</div></div>
        <div className={styles.metricCard}><span className={styles.metricLabel}>Submissions shown</span><div className={styles.metricValue}>{rows.length}</div></div>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {rows.map((row) => <article key={row.submission_id} className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div><h2 className={styles.sectionTitle}>{row.student_name} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>· {row.student_email}</span></h2>
              <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{row.school_name ?? "Independent student"} · {row.course_title} · {row.lesson_title}</p>
              <p style={{ marginTop: 6 }}>{row.assessment_title} · Submitted {new Date(row.submitted_at).toLocaleString()}</p>
            </div>
            <div style={{ textAlign: "right" }}><strong>{row.score}%</strong><p>{row.passed ? "Passed" : "Needs another attempt"}</p><p style={{ color: "var(--text-muted)" }}>{row.unlocked ? "Lesson unlocked" : "Waiting for review"}</p></div>
          </div>
          {row.status === "pending" && !row.unlocked && <button type="button" className={styles.actionBtn} disabled={Boolean(busyId)} onClick={() => void verify(row)} style={{ marginTop: 14 }}>{busyId === row.submission_id ? "Verifying…" : "Verify and unlock lesson"}</button>}
          {row.status === "pending" && row.unlocked && <p style={{ color: "var(--text-muted)", marginTop: 14 }}>The ten-minute review window elapsed; this lesson unlocked automatically.</p>}
          {row.verified_at && <p style={{ color: "var(--text-muted)", marginTop: 14 }}>Verified {new Date(row.verified_at).toLocaleString()}</p>}
        </article>)}
        {rows.length === 0 && <section className={styles.sectionCard}>No quiz submissions have been received.</section>}
      </div>
    </>}
  </div>;
}
