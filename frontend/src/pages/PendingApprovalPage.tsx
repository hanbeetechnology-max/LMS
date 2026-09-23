import { Navigate } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { Reveal } from "../components/ui/Reveal";
import { useAuth } from "../lib/AuthProvider";
import { PageLoadingFallback } from "../components/PageLoadingFallback";

export function PendingApprovalPage() {
  const { profile, loading, signOut } = useAuth();

  if (loading) {
    return <PageLoadingFallback />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Nothing to show once approved (or for any non-staff account) — send
  // them on to wherever they'd normally land.
  if (profile.role !== "staff" || profile.approved) {
    const destination = profile.role === "manager" ? "/manager/dashboard" : profile.role === "staff" ? "/staff/dashboard" : "/student/dashboard";
    return <Navigate to={destination} replace />;
  }

  return (
    <>
      <Seo title="Verification pending" description="Your staff account is awaiting manager approval." path="/pending-approval" />
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Reveal>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--color-amber-soft) text-(--color-amber-deep)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
            Verification is ongoing
          </h1>
          <p className="mt-3 max-w-sm text-[15px] text-(--color-slate)">
            Your staff account has been created, but it needs a manager's approval before you can sign in. Please
            contact your organization for approval.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            Sign out
          </button>
        </Reveal>
      </div>
    </>
  );
}
