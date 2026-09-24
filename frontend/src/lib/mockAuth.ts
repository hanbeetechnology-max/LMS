export type Role = "staff" | "student" | "manager" | "school_staff";

interface MockUser {
  id: string;
  email: string;
  password: string;
  role: Role;
  fullName: string;
}

/**
 * Phase 1 (see docs/PLAN.md §6) replaces this with real Supabase accounts.
 * Until then, these two seeded credentials are the only way to sign in —
 * enough to exercise every staff and student page end-to-end without a
 * backend. Session state is persisted to localStorage, not a server.
 */
export const DEMO_ACCOUNTS: { email: string; password: string; role: Role; label: string }[] = [
  { email: "jamie@hanbeelms.edu", password: "staff123", role: "staff", label: "Staff" },
  { email: "ava@student.edu", password: "student123", role: "student", label: "Student" },
  { email: "morgan@hanbeelms.edu", password: "manager123", role: "manager", label: "Manager" },
];

const MOCK_USERS: MockUser[] = [
  { id: "staff-1", email: "jamie@hanbeelms.edu", password: "staff123", role: "staff", fullName: "Jamie Rivera" },
  { id: "student-1", email: "ava@student.edu", password: "student123", role: "student", fullName: "Ava Chen" },
  { id: "manager-1", email: "morgan@hanbeelms.edu", password: "manager123", role: "manager", fullName: "Morgan Ellis" },
];

const SESSION_KEY = "hanbeelms.session";

export interface StoredSession {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

export function signIn(email: string, password: string): StoredSession | null {
  const user = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
  );
  if (!user) return null;
  const session: StoredSession = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
