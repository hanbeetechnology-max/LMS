import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { AuthLayout } from "../layouts/AuthLayout";
import { TextField } from "../components/ui/TextField";
import { EnrollmentIcon } from "../components/landing/icons";
import { useAuth } from "../lib/AuthProvider";
import { applyAsHanbeeStaff } from "../lib/portalApi";
import { CheckboxField, EMAIL_RE, FormAlert, primaryButtonClass, textLinkClass, validatePasswordPair } from "../portal/auth/authKit";

export function SignupPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", agree: false });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: "fullName" | "email" | "password" | "confirmPassword") => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required";
    if (!form.email) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email)) next.email = "Enter a valid email address";
    Object.assign(next, validatePasswordPair(form.password, form.confirmPassword));
    if (!form.agree) next.agree = "You must agree to the terms to continue";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await applyAsHanbeeStaff({ email: form.email.trim(), password: form.password, fullName: form.fullName.trim() });
      if (!res.ok) {
        setFormError(res.error ?? "We could not send your application. Please try again.");
        return;
      }
      const profile = await signIn(form.email.trim(), form.password);
      navigate(profile ? "/pending-approval" : "/login", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Hanbee staff application" description="Apply for a HANBEE staff account. The manager approves each application." path="/signup" />
      <AuthLayout
        panelIcon={EnrollmentIcon}
        panelTitle="Join the HANBEE team"
        panelDescription="Run courses, schools and the tournament. The manager approves every staff application."
        accent="--color-teal"
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Hanbee staff application</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-(--color-slate)">
          This form is only for HANBEE staff. Your account needs the manager's approval before you can get in.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <TextField label="Full name" name="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} />
          <TextField label="Email" type="email" name="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
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
          <CheckboxField id="agree" checked={form.agree} onChange={(v) => setForm((f) => ({ ...f, agree: v }))} error={errors.agree}>
            I agree to the{" "}
            <Link to="/terms" target="_blank" className={textLinkClass}>
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className={textLinkClass}>
              Privacy Policy
            </Link>
            .
          </CheckboxField>
          <FormAlert>{formError}</FormAlert>
          <button type="submit" disabled={submitting} className={`${primaryButtonClass} mt-1`}>
            {submitting ? "Sending..." : "Send application"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-1 rounded-xl bg-(--color-cloud) px-4 py-3 text-xs leading-relaxed text-(--color-slate)">
          <p>
            Running a school?{" "}
            <Link to="/register-school" className={textLinkClass}>
              Register your school
            </Link>
            .
          </p>
          <p>Students join through their school's invitation link.</p>
        </div>

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
