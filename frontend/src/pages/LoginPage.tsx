import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { AuthLayout } from "../layouts/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { OAuthButtons } from "../components/ui/OAuthButtons";
import { CoursesIcon } from "../components/landing/icons";
import { useAuth } from "../lib/AuthProvider";
import { DEMO_ACCOUNTS } from "../lib/mockAuth";
import { supabaseConfigured } from "../lib/supabaseClient";

interface FormState {
  email: string;
  password: string;
  remember: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState<FormState>({ email: "", password: "", remember: false });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errors: Partial<Record<"email" | "password", string>> = {};
    if (!form.email) errors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address";
    if (!form.password) errors.password = "Password is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    // signIn tries Supabase first, falling back to the offline mock in
    // lib/mockAuth.ts only if that's unreachable — see lib/AuthProvider.tsx.
    const profile = await signIn(form.email, form.password);
    setSubmitting(false);
    if (!profile) {
      setFormError("Invalid email or password");
      return;
    }
    if (profile.role === "staff" && !profile.approved) {
      navigate("/pending-approval", { replace: true });
      return;
    }
    const destination = profile.role === "staff" ? "/staff/dashboard" : profile.role === "manager" ? "/manager/dashboard" : "/student/dashboard";
    navigate(destination, { replace: true });
  }

  return (
    <>
      <Seo
        title="Sign in"
        description="Sign in to your HanbeeLms account to manage courses, rosters, and attendance, or continue your learning."
        path="/login"
      />
      <AuthLayout
        panelIcon={CoursesIcon}
        panelTitle="One platform for every class"
        panelDescription="Courses, rosters, attendance, and messages — all in one calm dashboard."
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Welcome back</h1>
        <p className="mt-2 text-[15px] text-(--color-slate)">Sign in to your HanbeeLms account.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@school.edu"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={fieldErrors.email}
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={fieldErrors.password}
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-(--color-ink-soft)">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))}
                className="h-4 w-4 rounded border-(--color-line) accent-(--color-violet)"
              />
              Remember me
            </label>
            <Link to="/reset-password" className="font-medium text-(--color-slate) transition-colors hover:text-(--color-ink)">
              Forgot password?
            </Link>
          </div>

          {formError && (
            <p role="alert" className="rounded-xl bg-(--color-error-soft) px-4 py-3 text-sm text-(--color-error)">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 inline-flex items-center justify-center rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <OAuthButtons />

        {/* Real, working credentials have no business sitting on a public
            login page one click away from anyone — this only ever made
            sense before a real backend existed. Once Supabase is actually
            connected, this stays hidden permanently, not just in "prod". */}
        {!supabaseConfigured && (
          <div className="mt-8 rounded-xl border border-dashed border-(--color-line) p-4 text-sm">
            <p className="font-medium text-(--color-ink-soft)">Demo accounts (no backend yet)</p>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => setForm((f) => ({ ...f, email: account.email, password: account.password }))}
                className="mt-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left font-mono text-xs text-(--color-slate) transition-colors hover:bg-(--color-cloud) hover:text-(--color-ink)"
              >
                <span>{account.email}</span>
                <span className="rounded-full bg-(--color-cloud) px-2 py-0.5 text-[10px] font-sans font-semibold uppercase text-(--color-ink-soft)">
                  {account.label}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2 text-sm text-(--color-slate)">
          <p className="font-medium text-(--color-ink-soft)">New here?</p>
          <Link to="/signup" className="font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)">
            Staff — create an account →
          </Link>
          <Link to="/apply" className="font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)">
            Student — apply to a course →
          </Link>
          <Link to="/setup" className="font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)">
            Manager — set up your organization →
          </Link>
        </div>
      </AuthLayout>
    </>
  );
}
