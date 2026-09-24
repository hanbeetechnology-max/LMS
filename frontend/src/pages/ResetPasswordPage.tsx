import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Seo } from "../lib/Seo";
import { AuthLayout } from "../layouts/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { SchedulingIcon } from "../components/landing/icons";
import { useToast } from "../lib/ToastProvider";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;

function RequestStep() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      if (supabaseConfigured && supabase) {
        // Errors here are deliberately not surfaced — the "if an account
        // exists" copy below already avoids confirming/denying whether an
        // email is registered, and doing the same on failure (vs. only on
        // success) closes the same user-enumeration gap for network errors.
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password?type=recovery`,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-teal-soft) text-(--color-teal)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
          Check your inbox
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-(--color-slate)">
          If an account exists for <span className="font-medium text-(--color-ink-soft)">{email}</span>, we've sent
          a link to reset your password.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-(--color-line) px-6 py-3 text-sm font-semibold text-(--color-ink-soft) transition-colors duration-300 hover:border-(--color-ink) hover:text-(--color-ink)"
        >
          Back to sign in
        </Link>
        <p className="mt-6 text-xs leading-relaxed text-(--color-slate)">
          If the reset email does not arrive, your school or HANBEE administrator can help.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Reset your password</h1>
      <p className="mt-2 text-[15px] text-(--color-slate)">We'll email you a secure link.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex items-center justify-center rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-4 rounded-xl bg-(--color-cloud) px-4 py-3 text-xs leading-relaxed text-(--color-slate)">
        If the reset email does not arrive, your school or HANBEE administrator can help.
      </p>

      <p className="mt-8 text-sm text-(--color-slate)">
        <Link to="/login" className="font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)">
          ← Back to sign in
        </Link>
      </p>
    </>
  );
}

function NewPasswordStep() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Use at least 8 characters";
    if (confirmPassword !== password) next.confirmPassword = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (supabaseConfigured && supabase) {
        // Only succeeds with an active recovery session — the one Supabase
        // establishes automatically when a user follows the real emailed
        // link (which sets `?type=recovery` and a session token together).
        // Arriving here any other way genuinely has nothing to update yet.
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setFormError(error.message);
          return;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      showToast("Password updated. Sign in with your new password.");
      navigate("/login", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Set a new password</h1>
      <p className="mt-2 text-[15px] text-(--color-slate)">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <TextField
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
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
          {submitting ? "Saving…" : "Save new password"}
        </button>
      </form>
    </>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const isRecovery = searchParams.get("type") === "recovery";

  return (
    <>
      <Seo
        title={isRecovery ? "Set a new password" : "Reset your password"}
        description="Reset your HanbeeLms account password."
        path="/reset-password"
      />
      <AuthLayout
        panelIcon={SchedulingIcon}
        panelTitle="Back in, in seconds"
        panelDescription="A secure link is all it takes to get you back to your classes."
        accent="--color-amber"
      >
        {isRecovery ? <NewPasswordStep /> : <RequestStep />}
      </AuthLayout>
    </>
  );
}
