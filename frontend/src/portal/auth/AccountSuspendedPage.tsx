import { Navigate } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { AuthLayout } from "../../layouts/AuthLayout";
import { CoursesIcon } from "../../components/landing/icons";
import { PageLoadingFallback } from "../../components/PageLoadingFallback";
import { useAuth } from "../../lib/AuthProvider";
import { ROLE_HOME } from "../paths";
import { primaryButtonClass } from "./authKit";

export function AccountSuspendedPage() {
  const { profile, loading, signOut } = useAuth();
  if (loading) return <PageLoadingFallback />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.accountStatus === "active") return <Navigate to={ROLE_HOME[profile.role]} replace />;

  return (
    <>
      <Seo title="Account not active" description="This account is not active." path="/account-suspended" />
      <AuthLayout panelIcon={CoursesIcon} panelTitle="Account not active" panelDescription="Your access is switched off for now.">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">This account is not active</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-(--color-slate)">This account is not active. Contact HANBEE.</p>
        <button type="button" onClick={() => void signOut()} className={`${primaryButtonClass} mt-8`}>
          Sign out
        </button>
      </AuthLayout>
    </>
  );
}
