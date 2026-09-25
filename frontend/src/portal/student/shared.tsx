import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthProvider";
import { Card, EmptyState, ErrorBlock, Eyebrow, LoadingBlock, relativeTime, useAsync } from "../kit";

/** Primary (blue accent) button classes, shared by the student pages. */
export const primaryBtn = "inline-flex min-h-11 items-center justify-center rounded-lg bg-(--color-accent) px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";
export const secondaryBtn = "inline-flex min-h-11 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-card) px-5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-canvas) disabled:opacity-60";
export const textLink = "inline-flex min-h-11 items-center text-sm font-medium text-(--color-accent) hover:underline";

/** Ticks once a second and returns the time left until `iso`. */
export function useCountdown(iso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { over: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const s = Math.floor(ms / 1000);
  return { over: false, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** True when the student's school is closed/ended and they are not solo. */
export function useSchoolGone() {
  const { profile } = useAuth();
  const school = profile?.school;
  return !!school && !profile?.isSolo && (school.status === "closed" || school.memberStatus === "ended");
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

async function loadLatest(): Promise<{ rows: AnnouncementRow[]; total: number }> {
  if (!supabase) return { rows: [], total: 0 };
  const { data, error, count } = await supabase
    .from("announcements")
    .select("id, title, body, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  const rows = (data ?? []) as AnnouncementRow[];
  return { rows, total: count ?? rows.length };
}

/** Total number of announcements the student can see (for a stat card). */
export function useAnnouncementCount() {
  const { data } = useAsync(loadLatest, []);
  return data ? data.total : null;
}

export function LatestAnnouncements() {
  const { data, loading, error, reload } = useAsync(loadLatest, []);
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>Latest announcements</Eyebrow>
        <Link to="/student/announcements" className={textLink}>
          See all
        </Link>
      </div>
      <div className="mt-2">
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock onRetry={reload} />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState title="No announcements yet" />
        ) : (
          <ul className="divide-y divide-(--color-line)">
            {data.rows.map((a) => (
              <li key={a.id} className="py-3">
                <p className="font-medium text-(--color-ink)">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-(--color-slate)">{a.body}</p>
                <p className="mt-1 text-xs text-(--color-mist)">{relativeTime(a.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export const TEAM_STATUS_TEXT: Record<string, string> = {
  draft: "Not applied yet",
  applied: "Applied. Waiting for HANBEE to review.",
  payment_declared: "Waiting for HANBEE to verify payment",
  verified: "Verified by HANBEE",
  rejected: "Not accepted by HANBEE",
  withdrawn: "Withdrawn",
};
