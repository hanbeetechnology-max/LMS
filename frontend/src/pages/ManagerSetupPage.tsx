import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { AuthLayout } from "../layouts/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { SchedulingIcon } from "../components/landing/icons";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type FieldName = "fullName" | "email" | "password" | "confirmPassword";
type PageState = "checking" | "available" | "already-claimed" | "submitted";

/**
 * The one-time path to becoming HanbeeLms's first Manager — deliberately
 * distinct from /signup (staff, always self-service) and student invites.
 * Works exactly once: whoever gets here before anyone else claims it, via
 * `manager_exists()` gating the form, and the real enforcement lives
 * server-side in the `handle_new_user` trigger (supabase/migrations/0004_role_signup_security.sql)
 * — a second claim attempt silently becomes a student account instead of
 * erroring, so this page can't be used to even confirm whether a manager
 * already exists beyond what manager_exists() itself already reveals.
 * Every manager after the first is invited by an existing one, the same
 * way staff invite students.
 */
export function ManagerSetupPage() {
  const [pageState, setPageState] = useState<PageState>("checking");
  const [form, setForm] = useState<FormState>({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setPageState("available"); // offline mode: let the form render; submit will explain there's no database
      return;
    }
    supabase.rpc("manager_exists").then(({ data }) => {
      setPageState(data ? "already-claimed" : "available");
    });
  }, []);

  function validate() {
    const errors: Partial<Record<FieldName, string>> = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.email) errors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 8) errors.password = "Use at least 8 characters";
    if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords don't match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (!supabaseConfigured || !supabase) {
        setFormError("Manager setup needs a connected database — this deployment isn't set up for it yet.");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: "manager" } },
      });
      if (error) {
        setFormError(error.message);
        return;
      }
      setPageState("submitted");
    } finally {
      setSubmitting(false);
    }
  }

  if (pageState === "checking") {
    return (
      <AuthLayout
        panelIcon={SchedulingIcon}
        panelTitle="One account, org-wide oversight"
        panelDescription="Verifications, holidays, and staff performance — all in one place."
        accent="--color-violet"
      >
        <p className="text-sm text-(--color-mist)">Checking…</p>
      </AuthLayout>
    );
  }

  if (pageState === "already-claimed") {
    return (
      <>
        <Seo title="Manager already set up" description="HanbeeLms manager account setup." path="/setup" />
        <AuthLayout
          panelIcon={SchedulingIcon}
          panelTitle="One account, org-wide oversight"
          panelDescription="Verifications, holidays, and staff performance — all in one place."
          accent="--color-violet"
        >
          <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Already set up</h1>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-(--color-slate)">
            A manager account already exists for this organization. If that's not you, ask them for an invite —
            every manager after the first is added that way, not through this page.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-(--color-line) px-6 py-3 text-sm font-semibold text-(--color-ink-soft) transition-colors duration-300 hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            Back to sign in
          </Link>
        </AuthLayout>
      </>
    );
  }

  if (pageState === "submitted") {
    return (
      <>
        <Seo title="Check your email" description="Confirm your HanbeeLms manager account." path="/setup" />
        <AuthLayout
          panelIcon={SchedulingIcon}
          panelTitle="One account, org-wide oversight"
          panelDescription="Verifications, holidays, and staff performance — all in one place."
          accent="--color-violet"
        >
          <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Check your email</h1>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-(--color-slate)">
            We sent a confirmation link to <span className="font-medium text-(--color-ink-soft)">{form.email}</span>. Click it,
            then sign in — if you were the first to claim it, you're the manager.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-(--color-line) px-6 py-3 text-sm font-semibold text-(--color-ink-soft) transition-colors duration-300 hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            Back to sign in
          </Link>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Set up the manager account"
        description="Claim the one-time manager account for your HanbeeLms organization."
        path="/setup"
      />
      <AuthLayout
        panelIcon={SchedulingIcon}
        panelTitle="One account, org-wide oversight"
        panelDescription="Verifications, holidays, and staff performance — all in one place."
        accent="--color-violet"
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Set up the manager account</h1>
        <p className="mt-2 text-[15px] text-(--color-slate)">
          This works once — for whoever gets here first when a HanbeeLms organization is brand new. Every manager after
          this one is invited, not self-signed-up.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <TextField
            label="Full name"
            name="fullName"
            autoComplete="name"
            placeholder="Morgan Ellis"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            error={fieldErrors.fullName}
          />
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={fieldErrors.password}
          />
          <TextField
            label="Confirm password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            error={fieldErrors.confirmPassword}
          />

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
            {submitting ? "Claiming…" : "Claim manager account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-(--color-slate)">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)">
            Sign in →
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
