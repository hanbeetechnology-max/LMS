import { useEffect, useState } from "react";
import { Reveal, StaggerGroup, StaggerItem } from "../ui/Reveal";
import { ClockIcon } from "../landing/icons";
import { useAuth } from "../../lib/AuthProvider";
import type { ApiSession } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";

const STATUS_LABEL: Record<ApiSession["status"], string> = {
  active: "Active now",
  present: "Present",
  left_early: "Left early",
};

const STATUS_STYLES: Record<ApiSession["status"], string> = {
  active: "bg-(--color-violet-soft) text-(--color-violet-deep)",
  present: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  left_early: "bg-(--color-amber-soft) text-(--color-amber-deep)",
};

function formatWhen(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Real, Supabase-computed attendance — a session's presence is determined
 * purely by how long a login stayed heartbeat-active (see
 * supabase/migrations/0003_functions.sql's auto_attendance_sessions_effective
 * view), not by anyone marking a checkbox. Deliberately shown as its own
 * panel rather than merged into the existing per-section manual attendance
 * grids: those grids mark attendance for a fictional mock roster of students
 * who don't have real accounts, so there's nothing honest to merge yet —
 * this panel only ever reflects sessions that actually happened through
 * this app's real login.
 */
export function AutoAttendancePanel({ scope }: { scope: "mine" | "all" }) {
  const { authSource } = useAuth();
  const [sessions, setSessions] = useState<ApiSession[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase) return;
    // No explicit user_id filter needed for "mine": RLS on
    // auto_attendance_sessions (see supabase/migrations/0002_rls.sql)
    // already restricts a non-staff/manager caller to their own rows, so
    // an unfiltered query naturally becomes "mine" for a student and
    // "all" for staff/manager — exactly the two modes this panel needs.
    supabase
      .from("auto_attendance_sessions_effective")
      .select("id, user_id, login_at, ended_at, effective_status, duration_seconds, profiles(full_name)")
      .order("login_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError(true);
          return;
        }
        setSessions(
          data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            userName: (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
            userRole: "student",
            loginAt: new Date(row.login_at).getTime() / 1000,
            endedAt: row.ended_at ? new Date(row.ended_at).getTime() / 1000 : null,
            status: row.effective_status as ApiSession["status"],
            durationSeconds: row.duration_seconds,
          })),
        );
      });
  }, [authSource, scope]);

  if (authSource !== "supabase") {
    return (
      <Reveal className="rounded-2xl border border-(--color-line) p-5 text-sm text-(--color-mist)">
        System attendance needs a live backend session — not available in offline mode right now.
      </Reveal>
    );
  }

  if (error) {
    return (
      <Reveal className="rounded-2xl border border-(--color-line) p-5 text-sm text-(--color-mist)">
        Couldn't load system attendance right now.
      </Reveal>
    );
  }

  if (sessions === null) {
    return (
      <Reveal className="rounded-2xl border border-(--color-line) p-5 text-sm text-(--color-mist)">
        Loading system attendance…
      </Reveal>
    );
  }

  if (sessions.length === 0) {
    return (
      <Reveal className="rounded-2xl border border-(--color-line) p-5 text-sm text-(--color-mist)">
        No tracked sign-ins yet.
      </Reveal>
    );
  }

  return (
    <StaggerGroup className="flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
      {sessions.map((s) => (
        <StaggerItem key={s.id} y={12} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-cloud) text-(--color-slate)">
              <ClockIcon />
            </span>
            <div>
              {scope === "all" && <p className="font-medium text-(--color-ink)">{s.userName}</p>}
              <p className="text-xs text-(--color-mist)">
                Signed in {formatWhen(s.loginAt)} · {formatDuration(s.durationSeconds)}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}>{STATUS_LABEL[s.status]}</span>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
