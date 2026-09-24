import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "good" | "warn" | "bad" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-(--color-cloud) text-(--color-slate)",
  good: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  warn: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  bad: "bg-(--color-error-soft) text-(--color-error)",
  info: "bg-(--color-violet-soft) text-(--color-violet)",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

/** Maps the statuses used across the platform to a consistent tone. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "active":
    case "verified":
    case "joined":
    case "completed":
    case "live":
      return "good";
    case "pending":
    case "applied":
    case "payment_declared":
    case "upcoming":
    case "draft":
      return "warn";
    case "suspended":
    case "revoked":
    case "rejected":
    case "closed":
    case "expired":
    case "withdrawn":
      return "bad";
    default:
      return "neutral";
  }
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replace(/_/g, " ")}</Badge>;
}
