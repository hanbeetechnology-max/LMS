"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { Input, Select } from "../../ui/FormField";
import Shimmer from "../../ui/Shimmer";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

type Review = {
  submission_id: string; student_id: string; student_name: string; student_email: string; school_name: string | null;
  course_id: string; course_title: string; lesson_title: string; assessment_title: string;
  score: number; passed: boolean; status: string; unlocked: boolean;
  submitted_at: string; auto_unlock_at: string; verified_at: string | null;
};

const PAGE_SIZE = 20;

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const rpc = <T,>(name: string, args: Record<string, unknown>) =>
  authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

export default function AssessmentReviewQueue() {
  const { data: profile } = useSessionProfile();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "pending" | "verified">("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounced(search);
  const canView = profile?.role === "staff" || profile?.role === "manager" || profile?.role === "school_staff";
  const queryClient = useQueryClient();

  const queryArgs = { p_status: status || null, p_search: debouncedSearch || null, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE };
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["assessment-reviews", status, debouncedSearch, page],
    queryFn: () => rpc<Review[]>("list_assessment_reviews", queryArgs),
    enabled: canView,
    placeholderData: (previous) => previous,
  });
  const { data: total } = useQuery({
    queryKey: ["assessment-reviews-count", status, debouncedSearch],
    queryFn: () => rpc<number>("list_assessment_reviews_count", { p_status: status || null, p_search: debouncedSearch || null }),
    enabled: canView,
    placeholderData: (previous) => previous,
  });
  const { data: waitingTotal } = useQuery({
    queryKey: ["assessment-reviews-count", "pending", ""],
    queryFn: () => rpc<number>("list_assessment_reviews_count", { p_status: "pending", p_search: null }),
    enabled: canView,
  });

  const verify = useMutation({
    mutationFn: (row: Review) => rpc<unknown>("verify_assessment_submission", { p_submission_id: row.submission_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-reviews-count"] });
    },
  });

  const list = rows ?? [];
  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  return <div>
    <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Quiz reviews</h1><p className={styles.pageSubtitle}>Check quiz scores and verify submissions to unlock the next lesson</p></div>
    {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load assessment reviews."}</p>}
    {verify.isError && <p role="alert">{verify.error instanceof Error ? verify.error.message : "We couldn't verify this assessment."}</p>}
    {verify.isSuccess && <p role="status">Submission verified and the next lesson is unlocked.</p>}

    <div className={styles.metricsRow} style={{ marginBottom: 20 }}>
      <div className={styles.metricCard}><span className={styles.metricLabel}>Waiting for review</span><div className={styles.metricValue}>{waitingTotal ?? "—"}</div></div>
      <div className={styles.metricCard}><span className={styles.metricLabel}>Matching submissions</span><div className={styles.metricValue}>{total ?? "—"}</div></div>
    </div>

    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 320 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search by student, email, or course…" aria-label="Search quiz submissions" style={{ paddingLeft: 36 }} />
      </div>
      <Select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(0); }} aria-label="Filter by status" style={{ maxWidth: 180 }}>
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
      </Select>
    </div>

    {isLoading ? <Shimmer rows={4} /> : <>
      <div style={{ display: "grid", gap: 14 }}>
        {list.map((row) => <article key={row.submission_id} className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div><h2 className={styles.sectionTitle}>{row.student_name} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>· {row.student_email}</span></h2>
              <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{row.school_name ?? "Independent student"} · {row.course_title} · {row.lesson_title}</p>
              <p style={{ marginTop: 6 }}>{row.assessment_title} · Submitted {new Date(row.submitted_at).toLocaleString()}</p>
            </div>
            <div style={{ textAlign: "right" }}><strong>{row.score}%</strong><p>{row.passed ? "Passed" : "Needs another attempt"}</p><p style={{ color: "var(--text-muted)" }}>{row.unlocked ? "Lesson unlocked" : "Waiting for review"}</p></div>
          </div>
          {row.status === "pending" && !row.unlocked && <button type="button" className={styles.actionBtn} disabled={verify.isPending} onClick={() => verify.mutate(row)} style={{ marginTop: 14 }}>{verify.isPending && verify.variables?.submission_id === row.submission_id ? "Verifying…" : "Verify and unlock lesson"}</button>}
          {row.status === "pending" && row.unlocked && <p style={{ color: "var(--text-muted)", marginTop: 14 }}>The ten-minute review window elapsed; this lesson unlocked automatically.</p>}
          {row.verified_at && <p style={{ color: "var(--text-muted)", marginTop: 14 }}>Verified {new Date(row.verified_at).toLocaleString()}</p>}
        </article>)}
        {list.length === 0 && <section className={styles.sectionCard}>{search || status ? "No submissions match your filters." : "No quiz submissions have been received."}</section>}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={styles.actionBtn} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
            <button type="button" className={styles.actionBtn} disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </>}
  </div>;
}
