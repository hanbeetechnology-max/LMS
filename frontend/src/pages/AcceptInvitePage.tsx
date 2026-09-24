import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { AuthLayout } from "../layouts/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { EnrollmentIcon } from "../components/landing/icons";
import { useAuth } from "../lib/AuthProvider";
import { acceptPersonalInvite } from "../lib/portalApi";
import { ROLE_HOME } from "../portal/paths";
import { EMAIL_RE, FormAlert, NoticePage, primaryButtonClass, textLinkClass, validatePasswordPair } from "../portal/auth/authKit";

const INVITE_ERROR =
  "This invitation is not valid. It may be for a different email, expired, revoked or already used. Ask the person who invited you to send a new one.";

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <NoticePage
        seoTitle="Invitation link"
        path="/accept-invite"
        title="This invitation link is not valid"
        body="The link is missing its invitation code. Open the link from your invitation again, or ask for a new one."
        actionLabel="Back to sign in"
        actionTo="/login"
      />
    );
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required";
    if (!form.email) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email)) next.email = "Enter a valid email address";
    Object.assign(next, validatePasswordPair(form.password, form.confirmPassword));
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await acceptPersonalInvite({
        inviteToken: token ?? "",
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      });
      if (!res.ok) {
        setFormError(/network|reachable/i.test(res.error ?? "") ? (res.error as string) : INVITE_ERROR);
        return;
      }
      const profile = await signIn(form.email.trim(), form.password);
      if (!profile) {
        navigate("/login", { replace: true });
        return;
      }
      navigate(ROLE_HOME[profile.role], { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Accept your invitation" description="Create your HanbeeLms account from a personal invitation." path="/accept-invite" />
      <AuthLayout
        panelIcon={EnrollmentIcon}
        panelTitle="You've been invited"
        panelDescription="Create your account with the email the invitation was sent to."
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">You have been invited</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-(--color-slate)">
          Create your account with the email address the invitation was sent to. We check the invitation when you
          submit, and it decides what kind of account this becomes.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <TextField label="Invited email" type="email" name="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
          <TextField label="Full name" name="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
          />
          <TextField
            label="Confirm password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            error={errors.confirmPassword}
          />
          <FormAlert>{formError}</FormAlert>
          <button type="submit" disabled={submitting} className={`${primaryButtonClass} mt-1`}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-(--color-slate)">
          Already have an account?{" "}
          <Link to="/login" className={textLinkClass}>
            Sign in
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
