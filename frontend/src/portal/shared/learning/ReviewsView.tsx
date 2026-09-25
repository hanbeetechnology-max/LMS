import { useMemo, useState } from "react";
import { fetchAssessmentReviews, verifyAssessmentSubmission, type AssessmentReview } from "../../../lib/assessmentApi";
import { useToast } from "../../../lib/ToastProvider";
import { Card, ErrorBlock, LoadingBlock, PageHeader, SlideSwitcher, StatCard, useAsync } from "../../kit";
import { ConfirmDialog } from "../../manager/ConfirmDialog";
import { inputCls, pillBtn, ReviewsTable, useNow } from "./parts";

const TABS = [
  { id: "waiting", label: "Waiting" },
  { id: "verified", label: "Verified" },
  { id: "all", label: "All" },
];
const TEN_MIN = 10 * 60 * 1000;

/** Lesson reviews for Hanbee staff (can verify) and the manager (`readOnly`). */
export function ReviewsView({ readOnly = false }: { readOnly?: boolean }) {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(fetchAssessmentReviews, []);
  const now = useNow();
  const [tab, setTab] = useState("waiting");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<AssessmentReview | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = data ?? [];
  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending");
    const today = new Date().toDateString();
    const verifiedToday = rows.filter((r) => r.status === "verified" && r.verifiedAt && new Date(r.verifiedAt).toDateString() === today).length;
    const avg = rows.length ? Math.round(rows.reduce((n, r) => n + r.score, 0) / rows.length) : 0;
    return { waiting: pending.length, overdue: pending.filter((r) => now - new Date(r.submittedAt).getTime() > TEN_MIN).length, verifiedToday, avg };
  }, [rows, now]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "waiting" && r.status !== "pending") return false;
      if (tab === "verified" && r.status !== "verified") return false;
      if (!q) return true;
      return [r.studentName, r.studentEmail, r.schoolName ?? "", r.courseTitle, r.lessonTitle, r.assessmentTitle].some((s) => s.toLowerCase().includes(q));
    });
  }, [rows, tab, query]);

  async function verify() {
    if (!confirm) return;
    setBusy(true);
    try {
      await verifyAssessmentSubmission(confirm.submissionId);
      showToast(`Verified ${confirm.studentName}'s review.`);
      setConfirm(null);
      reload();
    } catch {
      showToast("Could not verify this review. Please try again.", "error");
    }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title="Lesson reviews" subtitle={readOnly ? "Every student quiz and where it stands. Reviews are verified by Hanbee staff." : "Verify student quizzes, or let them unlock automatically after 10 minutes."} />
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Waiting now" value={stats.waiting} tone={stats.waiting > 0 ? "warn" : "neutral"} />
            <StatCard label="Waiting over 10 min" value={stats.overdue} tone={stats.overdue > 0 ? "bad" : "neutral"} hint="These unlocked on their own" />
            <StatCard label="Verified today" value={stats.verifiedToday} tone="good" />
            <StatCard label="Average score" value={`${stats.avg}%`} />
          </div>
          {readOnly && (
            <Card>
              <p className="text-sm text-(--color-slate)">Reviews are verified by Hanbee staff. This page is for oversight only.</p>
            </Card>
          )}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SlideSwitcher label="Review status" tabs={TABS} value={tab} onChange={setTab} />
            <div className="w-full sm:max-w-xs">
              <label htmlFor="review-search" className="mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">
                Search
              </label>
              <input id="review-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Student, school, course or lesson" className={inputCls} />
            </div>
          </div>
          <ReviewsTable
            rows={shown}
            now={now}
            emptyTitle={tab === "waiting" && !query ? "No lesson reviews waiting" : "No reviews match"}
            emptyBody={tab === "waiting" && !query ? "New quiz submissions will show up here for a quick check." : "Try another tab or clear the search."}
            extra={
              readOnly
                ? undefined
                : {
                    key: "verify",
                    header: "Action",
                    render: (r) =>
                      r.status === "pending" ? (
                        <button type="button" onClick={() => setConfirm(r)} className={pillBtn} aria-label={`Verify review by ${r.studentName}`}>
                          Verify
                        </button>
                      ) : (
                        <span className="text-xs text-(--color-mist)">Done</span>
                      ),
                  }
            }
          />
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title="Verify this review?"
          body={`${confirm.studentName} scored ${Math.round(confirm.score)}% on "${confirm.lessonTitle || confirm.assessmentTitle}". Verifying lets them continue right away.`}
          confirmLabel="Verify"
          busy={busy}
          onConfirm={() => void verify()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
