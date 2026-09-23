import { Link } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { Reveal } from "../components/ui/Reveal";

export function NotAuthorizedPage() {
  return (
    <>
      <Seo title="Not authorized" description="You don't have access to this page." path="/not-authorized" />
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Reveal>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
            You don't have access to this page
          </h1>
          <p className="mt-3 max-w-sm text-[15px] text-(--color-slate)">
            This area is for a different account type. Sign in with the right account to continue.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            ← Back to sign in
          </Link>
        </Reveal>
      </div>
    </>
  );
}
