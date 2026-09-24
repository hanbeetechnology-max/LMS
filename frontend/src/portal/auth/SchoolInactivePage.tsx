import { Navigate } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { AuthLayout } from "../../layouts/AuthLayout";
import { CoursesIcon } from "../../components/landing/icons";
import { PageLoadingFallback } from "../../components/PageLoadingFallback";
import { useAuth } from "../../lib/AuthProvider";
import { ROLE_HOME } from "../paths";
import { primaryButtonClass } from "./authKit";

export function SchoolInactivePage() {
  const { profile, loading, signOut } = useAuth();
  if (loading) return <PageLoadingFallback />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.accountStatus !== "active") return <Navigate to="/account-suspended" replace />;

  const school = profile.school;
  const inactive = profile.role === "school_staff" && school && (school.status === "suspended" || school.status === "closed" || school.memberStatus !== "active");
  if (!inactive) {
    const pending = profile.role === "school_staff" && (!profile.approved || school?.status === "pending");
    return <Navigate to={pending ? "/pending-approval" : ROLE_HOME[profile.role]} replace />;
  }

  const statusLabel = school.status === "active" ? "Your access has ended" : school.status === "closed" ? "Closed" : "Suspended";

  return (
    <>
      <Seo title="School not active" description="Your school is not active on HanbeeLms." path="/school-inactive" />
      <AuthLayout panelIcon={CoursesIcon} panelTitle="School not active" panelDescription="Access resumes when HANBEE reactivates the school.">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Your school is not active</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-(--color-slate)">
          {school.name} is not active on HanbeeLms right now, so school staff cannot use the portal. Contact HANBEE to
          find out more.
        </p>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-(--color-cloud) px-4 py-3 text-sm">
          <dt className="text-(--color-mist)">School</dt>
          <dd className="font-medium text-(--color-ink)">{school.name}</dd>
          <dt className="text-(--color-mist)">Status</dt>
          <dd className="font-medium text-(--color-ink)">{statusLabel}</dd>
        </dl>
        <button type="button" onClick={() => void signOut()} className={`${primaryButtonClass} mt-8`}>
          Sign out
        </button>
      </AuthLayout>
    </>
  );
}
