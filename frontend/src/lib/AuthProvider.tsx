import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearSession, getStoredSession, signIn as mockSignIn, type StoredSession, type Role } from "./mockAuth";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { fetchMySchool, type AccountStatus, type MySchool } from "./portalApi";

export type { Role };

export interface Profile {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  /** A self-service staff signup is created unapproved and stays locked out
   *  of every staff-privileged route/action until a manager approves them
   *  (see supabase/migrations/0005_staff_approval.sql). Always true for
   *  every other role and signup path. */
  approved: boolean;
  /** Suspended or revoked accounts are sent to /account-suspended (migration 0023). */
  accountStatus: AccountStatus;
  /** A student with no school (added by Hanbee staff, or converted after their school closed). */
  isSolo: boolean;
  /** The latest school membership, even an ended one, so a student whose school
   *  closed can be told so. Null for staff, managers and solo students. */
  school: MySchool | null;
}

/** What's backing the current session's attendance tracking, if any. */
export type AttendanceBackend = { kind: "supabase"; sessionId: string } | null;

/** Which tier actually authenticated this session — lets any feature
 *  (announcements, certificates, attendance) know whether it has a real
 *  database to call, or is running against the offline mock. */
export type AuthSource = "supabase" | "mock" | null;

interface AuthContextValue {
  user: null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  authSource: AuthSource;
  attendanceBackend: AttendanceBackend;
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signOut: () => void;
  /** Reload the profile and school after something changed them (joined a school, went solo). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toProfile(session: StoredSession): Profile {
  return { id: session.id, role: session.role, fullName: session.fullName, email: session.email, avatarUrl: null, approved: true, accountStatus: "active", isSolo: false, school: null };
}

async function fetchSupabaseProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, approved, account_status, is_solo")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  const role = data.role as Role;
  const school = role === "student" || role === "school_staff" ? await fetchMySchool() : null;
  return {
    id: data.id, role, fullName: data.full_name, email: data.email, avatarUrl: data.avatar_url, approved: data.approved,
    accountStatus: data.account_status as AccountStatus, isSolo: data.is_solo, school,
  };
}

const HEARTBEAT_TIMEOUT_MS = 90_000; // mirrors supabase/migrations/0003_functions.sql's finalize threshold

/**
 * Reuses an existing, still-live attendance session for this user instead of
 * minting a new row — a page reload (or React StrictMode's dev-mode double
 * effect invocation) is not a new login event. Only creates a new row when
 * there's genuinely no live one to attach to. This is also what makes
 * repeated calls (StrictMode, a fast reload) idempotent instead of
 * accumulating rows: every real request this session makes against
 * Supabase costs real quota, and "one row per reload" was quietly eating a
 * large share of a day's request budget for no attendance-accuracy benefit
 * (see docs/PLAN.md §10.40 — this is what 13k requests/day turned out to be).
 */
async function resolveSupabaseAttendanceSession(userId: string): Promise<string | null> {
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("auto_attendance_sessions")
    .select("id, last_heartbeat_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("login_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && Date.now() - new Date(existing.last_heartbeat_at).getTime() < HEARTBEAT_TIMEOUT_MS) {
    return existing.id;
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("auto_attendance_sessions").insert({ user_id: userId, expires_at: expiresAt }).select("id").single();
  if (error || !data) return null;
  return data.id;
}

/**
 * Sign-in tries Supabase (the real database — supabase/) first, falling
 * back to the offline mock in lib/mockAuth.ts only when Supabase isn't
 * configured at all — never on a real authentication failure (wrong
 * password stops right there, it doesn't fall through).
 *
 * The backend/ FastAPI prototype this used to also try (see docs/PLAN.md
 * §10.33) is retired as of §10.40: Supabase now does everything it did —
 * auth, attendance, announcements, certificates — for real, and running two
 * live backends only meant two systems' rate limits and quotas to reason
 * about for a fallback tier that, in over a week of real use, never once
 * actually triggered. The backend/ folder itself is left on disk, unused,
 * rather than deleted — this project has no git history to recover it from
 * if that turns out to be wrong.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attendanceBackend, setAttendanceBackend] = useState<AttendanceBackend>(null);
  const [authSource, setAuthSource] = useState<AuthSource>(null);

  useEffect(() => {
    (async () => {
      if (supabaseConfigured && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const prof = await fetchSupabaseProfile(session.user.id);
          if (prof) {
            setProfile(prof);
            setAuthSource("supabase");
            const sessionId = await resolveSupabaseAttendanceSession(session.user.id);
            if (sessionId) setAttendanceBackend({ kind: "supabase", sessionId });
            setLoading(false);
            return;
          }
        }
      }

      const session = getStoredSession();
      if (session) {
        setProfile(toProfile(session));
        setAuthSource("mock");
      }
      setLoading(false);
    })();
  }, []);

  async function signIn(email: string, password: string) {
    if (supabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        const prof = await fetchSupabaseProfile(data.session.user.id);
        if (prof) {
          setProfile(prof);
          setAuthSource("supabase");
          const sessionId = await resolveSupabaseAttendanceSession(data.session.user.id);
          if (sessionId) setAttendanceBackend({ kind: "supabase", sessionId });
          return prof;
        }
      }
      // Invalid credentials against a *reachable* Supabase project is a real
      // failure — don't fall through to the mock path for that.
      if (error && error.status !== undefined && error.status < 500) return null;
    }

    const session = mockSignIn(email, password);
    if (!session) return null;
    const prof = toProfile(session);
    setProfile(prof);
    setAuthSource("mock");
    return prof;
  }

  function signOut() {
    if (attendanceBackend?.kind === "supabase" && supabase) {
      supabase.rpc("finalize_my_session", { p_session_id: attendanceBackend.sessionId }).then(() => {});
      supabase.auth.signOut();
    }
    clearSession();
    setAttendanceBackend(null);
    setAuthSource(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const prof = await fetchSupabaseProfile(session.user.id);
    if (prof) setProfile(prof);
  }

  return (
    <AuthContext.Provider value={{ user: null, profile, role: profile?.role ?? null, loading, authSource, attendanceBackend, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
