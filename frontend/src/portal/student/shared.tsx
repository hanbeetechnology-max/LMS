import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthProvider";
import { Card, EmptyState, ErrorBlock, LoadingBlock, relativeTime, useAsync } from "../kit";

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

async function loadLatest(): Promise<AnnouncementRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return (data ?? []) as AnnouncementRow[];
}

export function LatestAnnouncements() {
  const { data, loading, error, reload } = useAsync(loadLatest, []);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-(--color-ink)">Latest announcements</h2>
        <Link to="/student/announcements" className="text-sm font-medium text-(--color-violet) underline">
          See all
        </Link>
      </div>
      <div className="mt-3">
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock onRetry={reload} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No announcements yet" />
        ) : (
          <ul className="divide-y divide-(--color-line)">
            {data.map((a) => (
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
