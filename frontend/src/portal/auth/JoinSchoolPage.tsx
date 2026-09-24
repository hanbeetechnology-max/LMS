import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { AuthLayout } from "../../layouts/AuthLayout";
import { TextField } from "../../components/ui/TextField";
import { EnrollmentIcon } from "../../components/landing/icons";
import { useAuth } from "../../lib/AuthProvider";
import { getJoinInfo, joinSchool, joinWithSchoolLink, preflightJoin } from "../../lib/portalApi";
import { ROLE_HOME } from "../paths";
import { EMAIL_RE, FormAlert, NoticePage, primaryButtonClass, textLinkClass, validatePasswordPair } from "./authKit";

type Load = { state: "loading" } | { state: "invalid" } | { state: "ok"; schoolName: string };

export function JoinSchoolPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { profile, signIn, refreshProfile } = useAuth();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    getJoinInfo(token)
      .then((info) => {
        if (!cancelled) setLoad(info ? { state: "ok", schoolName: info.schoolName } : { state: "invalid" });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (load.state === "loading") {
    return (
      <AuthLayout panelIcon={EnrollmentIcon} panelTitle="Join your school" panelDescription="Your school invited you to HanbeeLms.">
        <div className="flex flex-col items-center py-12 text-center" role="status" aria-live="polite">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-(--color-line) border-t-(--color-violet)" />
          <p className="mt-4 text-sm text-(--color-slate)">Checking your link...</p>
        </div>
      </AuthLayout>
    );
  }

  if (load.state === "invalid") {
    return (
      <NoticePage
        seoTitle="Invalid link"
        path="/join"
        title="This link is not valid"
        body="The school link may be wrong, out of date or turned off. Ask your school staff for a new one."
        actionLabel="Go to the home page"
      />
    );
  }

  const schoolName = load.schoolName;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Already signed in as a student with no active school: one click join.
  const canQuickJoin = profile?.role === "student" && !(profile.school && profile.school.memberStatus === "active" && profile.school.status !== "closed");

  async function quickJoin() {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await joinSchool(token);
      if (!res.ok) {
        setFormError(res.error ?? "We could not add you to this school.");
        return;
      }
      await refreshProfile();
      navigate(ROLE_HOME.student, { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

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
      const pre = await preflightJoin(token, form.email.trim());
      if (pre === "invalid_link") {
        setLoad({ state: "invalid" });
        return;
      }
      if (pre === "not_invited") {
        setFormError("This email has not been invited by your school. Ask your school staff to add it.");
        return;
      }
      const res = await joinWithSchoolLink({
        joinToken: token,
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      });
      if (!res.ok) {
        setFormError(res.error ?? "We could not create your account. Please try again.");
        return;
      }
      const p = await signIn(form.email.trim(), form.password);
      if (!p) {
        navigate("/login", { replace: true });
        return;
      }
      navigate(ROLE_HOME[p.role], { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title={`Join ${schoolName}`} description="Create your student account with your school's invitation link." path="/join" />
      <AuthLayout
        panelIcon={EnrollmentIcon}
        panelTitle={schoolName}
        panelDescription="Your school invited you. Join to take courses and race with your team."
        accent="--color-teal"
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Join {schoolName}</h1>

        {canQuickJoin ? (
          <div className="mt-4 flex flex-col gap-5">
            <p className="text-[15px] leading-relaxed text-(--color-slate)">
              You are signed in as {profile?.email}. Join {schoolName} with this account.
            </p>
            <FormAlert>{formError}</FormAlert>
            <button type="button" onClick={quickJoin} disabled={submitting} className={primaryButtonClass}>
              {submitting ? "Joining..." : `Join ${schoolName}`}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[15px] text-(--color-slate)">
              Create your student account. Use the email your school invited.
            </p>
            <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
              <TextField label="Full name" name="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} />
              <TextField label="Invited email" type="email" name="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
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
                {submitting ? "Joining..." : "Create account and join"}
              </button>
            </form>
            <p className="mt-6 text-sm text-(--color-slate)">
              Already have an account?{" "}
              <Link to="/login" className={textLinkClass}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </AuthLayout>
    </>
  );
}
