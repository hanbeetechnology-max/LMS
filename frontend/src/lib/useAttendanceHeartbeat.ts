import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabaseClient";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Pings Supabase's `heartbeat()` RPC (supabase/migrations/0003_functions.sql)
 * while an authenticated tab is open and in the foreground. This is what
 * makes attendance autonomous: presence is decided purely by whether
 * heartbeats kept arriving, not by anyone marking a checkbox. Pausing on
 * tab-hide (not just tab-close) is deliberate: a backgrounded tab isn't
 * someone actively attending either.
 *
 * No-ops entirely when there's no real Supabase session behind the current
 * one (offline mock fallback, or most of the e2e suite where it isn't
 * configured).
 */
export function useAttendanceHeartbeat() {
  const { attendanceBackend } = useAuth();

  useEffect(() => {
    if (!attendanceBackend) return;

    let cancelled = false;
    function ping() {
      if (document.visibilityState !== "visible") return;
      supabase?.rpc("heartbeat", { p_session_id: attendanceBackend!.sessionId }).then(() => {});
    }

    ping();
    const interval = setInterval(() => {
      if (!cancelled) ping();
    }, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [attendanceBackend]);
}
