import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { AuthLayout } from "../layouts/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { OAuthButtons } from "../components/ui/OAuthButtons";
import { EnrollmentIcon } from "../components/landing/icons";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

type FieldName = "fullName" | "email" | "password" | "confirmPassword" | "agreeToTerms";

function passwordStrength(password: string): { label: string; color: string; score: number } {
  if (!password) return { label: "", color: "", score: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak", color: "--color-error", score };
  if (score <= 2) return { label: "Fair", color: "--color-amber", score };
  return { label: "Strong", color: "--color-teal", score };
}

export function SignupPage() {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  function validate() {
    const errors: Partial<Record<FieldName, string>> = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.email) errors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 8) errors.password = "Use at least 8 characters";
    if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords don't match";
    if (!form.agreeToTerms) errors.agreeToTerms = "You must agree to the terms to continue";
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
        await new Promise((resolve) => setTimeout(resolve, 700));
        setFormError("Signup needs a connected database — this deployment isn't set up for it yet.");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: "staff" } },
      });
      if (error) {
        setFormError(error.message);
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <>
        <Seo title="Check your email" description="Confirm your HanbeeLms staff account." path="/signup" />
        <AuthLayout
          panelIcon={EnrollmentIcon}
          panelTitle="Set up your first course in minutes"
          panelDescription="Build modules, invite students by section, and start tracking attendance right away."
          accent="--color-teal"
        >
          <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Check your email</h1>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-(--color-slate)">
            We sent a confirmation link to <span className="font-medium text-(--color-ink-soft)">{form.email}</span>. Click it to
            activate your account. A manager still needs to approve it before you can sign in — you'll see a
            verification-pending notice until they do.
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
        title="Create your staff account"
        description="Staff sign up to create courses, manage rosters, and invite students to HanbeeLms."
        path="/signup"
      />
      <AuthLayout
        panelIcon={EnrollmentIcon}
        panelTitle="Set up your first course in minutes"
        panelDescription="Build modules, invite students by section, and start tracking attendance right away."
        accent="--color-teal"
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
          Create your staff account
        </h1>
        <p className="mt-2 text-[15px] text-(--color-slate)">
          HanbeeLms is built for instructors and admins — set up courses, invite students, and run your sections.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <TextField
            label="Full name"
            name="fullName"
            autoComplete="name"
            placeholder="Jamie Rivera"
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
          <div>
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
            {form.password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-1 flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="h-full flex-1 rounded-full transition-colors duration-300"
                      style={{
                        background: i < strength.score ? `var(${strength.color})` : "var(--color-line)",
                      }}
                    />
                  ))}
                </div>
                <span className="font-mono text-xs text-(--color-mist)">{strength.label}</span>
              </div>
            )}
          </div>
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

          <div>
            <label className="flex items-start gap-2.5 text-sm text-(--color-ink-soft)">
              <input
                type="checkbox"
                checked={form.agreeToTerms}
                onChange={(e) => setForm((f) => ({ ...f, agreeToTerms: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-(--color-line) accent-(--color-violet)"
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="font-medium text-(--color-ink) hover:text-(--color-violet)">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="font-medium text-(--color-ink) hover:text-(--color-violet)">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {fieldErrors.agreeToTerms && (
              <p className="mt-1.5 text-xs text-(--color-error)">{fieldErrors.agreeToTerms}</p>
            )}
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
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <OAuthButtons />

        <p className="mt-6 rounded-xl bg-(--color-cloud) px-4 py-3 text-xs leading-relaxed text-(--color-slate)">
          Are you a student? You'll receive an invite link from your instructor — no signup needed here.
          <br />
          Setting up a brand-new organization and need the manager account?{" "}
          <Link to="/setup" className="font-medium text-(--color-ink) hover:text-(--color-violet)">
            Claim it here
          </Link>
          .
        </p>

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
