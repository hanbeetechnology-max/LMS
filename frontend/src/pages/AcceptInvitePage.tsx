import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Seo } from "../lib/Seo";
import { AuthLayout } from "../layouts/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { EnrollmentIcon } from "../components/landing/icons";
import { supabase } from "../lib/supabaseClient";

const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;

type InviteState = "checking" | "valid" | "invalid";

function InvalidInvite() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-amber-soft) text-(--color-amber)">
        <EnrollmentIcon />
      </span>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
        This invite link is no longer valid
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-(--color-slate)">
        The link may have expired, already been used, or been revoked by your instructor.
      </p>
      <a
        href="mailto:support@hanbeelms.edu?subject=My%20invite%20link%20isn%27t%20working"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        Contact your instructor
      </a>
      <p className="mt-6 text-sm text-(--color-slate)">
        <Link to="/login" className="font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)">
          ← Back to sign in
        </Link>
      </p>
    </motion.div>
  );
}

function ValidInvite({ courseName, sectionName, invitedEmail }: { courseName: string; sectionName: string; invitedEmail: string }) {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Use at least 8 characters";
    if (confirmPassword !== password) next.confirmPassword = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email: invitedEmail,
          password,
          options: { data: { full_name: fullName, role: "student" } },
        });
        if (error) {
          setFormError(error.message);
          return;
        }
        setFormError("Account created. Check your inbox to confirm your email, then sign in to join your section.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
      setFormError("Invite acceptance needs a configured database. This offline preview cannot create accounts.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-violet-soft) text-(--color-violet)">
        <EnrollmentIcon />
      </span>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-(--color-ink)">You're invited</h1>
      <p className="mt-2 text-[15px] text-(--color-slate)">Set a password to join {sectionName}.</p>

      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-(--color-violet-soft) px-4 py-1.5 font-mono text-xs text-(--color-violet-deep)">
        Joining: {courseName} — {sectionName}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <TextField label="Email" type="email" value={invitedEmail} disabled readOnly className="opacity-60" />
        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="Jamie Rivera"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirm password"
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
          {submitting ? "Joining…" : "Join section"}
        </button>
      </form>
    </motion.div>
  );
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<InviteState>("checking");
  const [invite, setInvite] = useState<{ courseName: string; sectionName: string; email: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    if (!supabase) {
      setInvite({
        courseName: searchParams.get("course") ?? "your course",
        sectionName: searchParams.get("section") ?? "your section",
        email: searchParams.get("email") ?? "",
      });
      setState("valid");
      return;
    }
    supabase.rpc("get_invitation", { p_id: token }).then(({ data, error }) => {
      const record = Array.isArray(data) ? data[0] : data;
      if (error || !record || record.accepted || !record.email) {
        setState("invalid");
        return;
      }
      setInvite({ courseName: record.course_title ?? "your course", sectionName: record.section_name ?? "your section", email: record.email });
      setState("valid");
    });
  }, [searchParams, token]);

  return (
    <>
      <Seo title="Accept your invite" description="Set a password to join your class on HanbeeLms." path="/accept-invite" />
      <AuthLayout
        panelIcon={EnrollmentIcon}
        panelTitle={searchParams.get("section") ? `Joining ${searchParams.get("section")}` : "You've been invited"}
        panelDescription="Your instructor is waiting for you on the other side."
        accent="--color-violet"
      >
        {state === "checking" && (
          <div className="flex flex-col items-center py-12 text-center" role="status" aria-live="polite">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-(--color-line) border-t-(--color-violet)" />
            <p className="mt-4 text-sm text-(--color-slate)">Checking your invite…</p>
          </div>
        )}
        {state === "invalid" && <InvalidInvite />}
        {state === "valid" && invite && (
          <ValidInvite
            courseName={invite.courseName}
            sectionName={invite.sectionName}
            invitedEmail={invite.email}
          />
        )}
      </AuthLayout>
    </>
  );
}
