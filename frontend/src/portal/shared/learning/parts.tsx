import { useEffect, useState } from "react";
import { Badge, DataTable, formatDate, relativeTime, type Column } from "../../kit";
import type { AssessmentReview } from "../../../lib/assessmentApi";
import type { CertificateOverviewRow } from "../../../lib/certificatesApi";

export const pillBtn =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-line) bg-(--color-card) px-4 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud) disabled:opacity-50";
export const darkBtn =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper) hover:opacity-90 disabled:opacity-50";
export const inputCls =
  "min-h-11 w-full rounded-lg border border-(--color-line) bg-(--color-card) px-3 text-sm text-(--color-ink) placeholder:text-(--color-mist)";

/** Re-renders every `ms` so countdowns and "12m ago" stay live. */
export function useNow(ms = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** "unlocks in 6 min" or "unlocked automatically". */
export function unlockText(autoUnlockAt: string, now: number): { over: boolean; text: string } {
  const ms = new Date(autoUnlockAt).getTime() - now;
  if (ms <= 0) return { over: true, text: "unlocked automatically" };
  const mins = Math.ceil(ms / 60000);
  return { over: false, text: `unlocks in ${mins} min` };
}

export function ReviewStatus({ status, autoUnlockAt, now }: { status: string; autoUnlockAt: string; now: number }) {
  if (status === "verified") return <Badge tone="good">Verified</Badge>;
  if (status === "failed") return <Badge tone="bad">Failed</Badge>;
  const u = unlockText(autoUnlockAt, now);
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge tone={u.over ? "neutral" : "warn"}>{u.over ? "Not yet verified" : "Waiting"}</Badge>
      <span className="text-xs text-(--color-slate)">{u.text}</span>
    </span>
  );
}

export function ScoreCell({ score, passed }: { score: number; passed: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-medium text-(--color-ink)">{Math.round(score)}%</span>{" "}
      <span className={passed ? "text-(--color-teal-deep)" : "text-(--color-error)"}>{passed ? "passed" : "failed"}</span>
    </span>
  );
}

export function StudentCell({ name, email }: { name: string; email: string }) {
  return (
    <span className="block">
      <span className="block font-medium text-(--color-ink)">{name || "Unnamed"}</span>
      <span className="block text-xs text-(--color-slate)">{email}</span>
    </span>
  );
}

/** Read-only reviews table (also used by the school Courses page). `extra` adds a trailing action column. */
export function ReviewsTable({
  rows,
  now,
  extra,
  showSchool = true,
  emptyTitle = "No lesson reviews yet",
  emptyBody = "Reviews appear here when students finish a lesson quiz.",
}: {
  rows: AssessmentReview[];
  now: number;
  extra?: Column<AssessmentReview>;
  showSchool?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const columns: Column<AssessmentReview>[] = [
    { key: "student", header: "Student", sortValue: (r) => r.studentName.toLowerCase(), render: (r) => <StudentCell name={r.studentName} email={r.studentEmail} /> },
    ...(showSchool ? [{ key: "school", header: "School", sortValue: (r: AssessmentReview) => r.schoolName ?? "", render: (r: AssessmentReview) => <span className="whitespace-nowrap">{r.schoolName ?? "Solo"}</span> }] : []),
    {
      key: "lesson",
      header: "Course and lesson",
      sortValue: (r) => r.courseTitle.toLowerCase(),
      render: (r) => (
        <span className="block max-w-[12rem]">
          <span className="block font-medium text-(--color-ink)">{r.lessonTitle || r.assessmentTitle}</span>
          <span className="block text-xs text-(--color-slate)">{r.courseTitle}</span>
        </span>
      ),
    },
    { key: "score", header: "Score", sortValue: (r) => r.score, render: (r) => <ScoreCell score={r.score} passed={r.passed} /> },
    { key: "submitted", header: "Submitted", sortValue: (r) => r.submittedAt, render: (r) => <span className="whitespace-nowrap">{relativeTime(r.submittedAt)}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <ReviewStatus status={r.status} autoUnlockAt={r.autoUnlockAt} now={now} /> },
    ...(extra ? [extra] : []),
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.submissionId} emptyTitle={emptyTitle} emptyBody={emptyBody} />;
}

export function viewLink(certificateId: string) {
  return `/verify/${certificateId}`;
}

export const linkBtn = pillBtn;

/** Certificates table with a View link (opens the public verify page in a new tab). */
export function CertificatesTable({
  rows,
  showSchool = true,
  withCopy = false,
  onCopy,
  emptyTitle = "No certificates yet",
  emptyBody = "A certificate is issued when a student completes every lesson of a course.",
}: {
  rows: CertificateOverviewRow[];
  showSchool?: boolean;
  withCopy?: boolean;
  onCopy?: (row: CertificateOverviewRow) => void;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const columns: Column<CertificateOverviewRow>[] = [
    { key: "student", header: "Student", sortValue: (r) => r.studentName.toLowerCase(), render: (r) => <StudentCell name={r.studentName} email={r.studentEmail} /> },
    ...(showSchool ? [{ key: "school", header: "School", sortValue: (r: CertificateOverviewRow) => r.schoolName ?? "", render: (r: CertificateOverviewRow) => <span className="whitespace-nowrap">{r.schoolName ?? "Solo"}</span> }] : []),
    { key: "course", header: "Course", sortValue: (r) => r.courseTitle.toLowerCase(), render: (r) => <span className="font-medium text-(--color-ink)">{r.courseTitle}</span> },
    { key: "serial", header: "Serial", sortValue: (r) => r.serial, render: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.serial}</span> },
    { key: "issued", header: "Issued", sortValue: (r) => r.issuedAt, render: (r) => <span className="whitespace-nowrap">{formatDate(r.issuedAt)}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <span className="flex flex-wrap gap-2">
          <a href={viewLink(r.certificateId)} target="_blank" rel="noopener" className={pillBtn} aria-label={`View certificate ${r.serial}`}>
            View
          </a>
          {withCopy && onCopy && (
            <button type="button" onClick={() => onCopy(r)} className={pillBtn}>
              Copy verify link
            </button>
          )}
        </span>
      ),
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.certificateId} emptyTitle={emptyTitle} emptyBody={emptyBody} />;
}
