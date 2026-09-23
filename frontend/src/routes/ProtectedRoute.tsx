import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type Role } from "../lib/AuthProvider";
import { PageLoadingFallback } from "../components/PageLoadingFallback";

interface ProtectedRouteProps {
  children: ReactNode;
  role?: Role | "any";
}

/**
 * Wired into router.tsx around the /staff and /student route trees.
 * AuthProvider currently checks against the seeded demo accounts in
 * lib/mockAuth.ts (no real backend yet — see docs/PLAN.md §6 for the
 * Supabase session this will become in Phase 1).
 */
export function ProtectedRoute({ children, role = "any" }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <PageLoadingFallback />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // A self-service staff signup can't reach any staff route until a manager
  // approves them — checked here too (not just at login) so a direct nav,
  // bookmark, or back-button can't route around it.
  if (profile.role === "staff" && !profile.approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (role !== "any" && profile.role !== role) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
