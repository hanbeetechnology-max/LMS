import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type Role } from "../lib/AuthProvider";
import { PageLoadingFallback } from "../components/PageLoadingFallback";

interface ProtectedRouteProps {
  children: ReactNode;
  /** One role, several roles, or "any" signed-in role. */
  role?: Role | Role[] | "any";
}

/**
 * The route guard. Order matters:
 *  1. still loading -> fallback
 *  2. not signed in -> /login
 *  3. suspended or revoked -> /account-suspended
 *  4. Hanbee staff not yet approved -> /pending-approval
 *  5. school staff whose school is still pending verification -> /pending-approval
 *  6. school staff whose school is suspended or closed -> /school-inactive
 *  7. wrong role -> /not-authorized
 * These states are also enforced by the database (migrations 0023, 0024,
 * 0028); this guard only decides which screen to show.
 */
export function ProtectedRoute({ children, role = "any" }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <PageLoadingFallback />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.accountStatus !== "active") {
    return <Navigate to="/account-suspended" replace />;
  }

  if (profile.role === "staff" && !profile.approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (profile.role === "school_staff") {
    if (!profile.approved || profile.school?.status === "pending") {
      return <Navigate to="/pending-approval" replace />;
    }
    if (!profile.school || profile.school.status !== "active" || profile.school.memberStatus !== "active") {
      return <Navigate to="/school-inactive" replace />;
    }
  }

  const allowed = role === "any" ? true : Array.isArray(role) ? role.includes(profile.role) : profile.role === role;
  if (!allowed) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
