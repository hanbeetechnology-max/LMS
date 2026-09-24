import { Navigate } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { Reveal } from "../components/ui/Reveal";
import { useAuth } from "../lib/AuthProvider";
import { PageLoadingFallback } from "../components/PageLoadingFallback";
import { ROLE_HOME } from "../portal/paths";
import { primaryButtonClass } from "../portal/auth/authKit";

export function PendingApprovalPage() {
  const { profile, loading, signOut } = useAuth();

  if (loading) return <PageLoadingFallback />;
  if (!profile) return <Navigate to="/login" replace />;

  const isSchool = profile.role === "school_staff";
  const waiting = isSchool
    ? !profile.approved || profile.school?.status === "pending"
    : profile.role === "staff" && !profile.approved;

  // Anyone already allowed in goes to their home; the route guard handles the rest.
  if (!waiting) return <Navigate to={ROLE_HOME[profile.role]} replace />;

  return (
    <>
      <Seo title="Waiting for approval" description="Your account is waiting for approval." path="/pending-approval" />
      <div className="rc-theme flex min-h-screen flex-col items-center justify-center bg-(--color-paper) px-6 text-center">
        <Reveal>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--color-amber-soft) text-(--color-amber-deep)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
            {isSchool ? "Verification in progress" : "Application received"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-(--color-slate)">
            {isSchool
              ? "Your school registration is waiting for verification by HANBEE. We will let you in as soon as it is approved."
              : "Your application is waiting for the manager's approval."}
          </p>
          {isSchool && profile.school && (
            <p className="mt-4 inline-flex rounded-full bg-(--color-cloud) px-4 py-1.5 text-sm font-medium text-(--color-ink-soft)">
              {profile.school.name}
            </p>
          )}
          <div className="mt-8">
            <button type="button" onClick={() => void signOut()} className={primaryButtonClass}>
              Sign out
            </button>
          </div>
        </Reveal>
      </div>
    </>
  );
}
