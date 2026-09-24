import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { AuthLayout } from "../../layouts/AuthLayout";
import { TextField } from "../../components/ui/TextField";
import { EnrollmentIcon } from "../../components/landing/icons";
import { useAuth } from "../../lib/AuthProvider";
import { registerSchool } from "../../lib/portalApi";
import { ROLE_HOME } from "../paths";
import { CheckboxField, EMAIL_RE, FormAlert, primaryButtonClass, textLinkClass, validatePasswordPair } from "./authKit";

type Field =
  | "fullName"
  | "email"
  | "password"
  | "confirmPassword"
  | "schoolName"
  | "registrationNo"
  | "officialEmail"
  | "consent";

export function RegisterSchoolPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolName: "",
    registrationNo: "",
    officialEmail: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const next: Partial<Record<Field, string>> = {};
    if (!form.fullName.trim()) next.fullName = "Your full name is required";
    if (!form.email) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email)) next.email = "Enter a valid email address";
    Object.assign(next, validatePasswordPair(form.password, form.confirmPassword));
    if (!form.schoolName.trim()) next.schoolName = "School name is required";
    if (!form.registrationNo.trim()) next.registrationNo = "School registration number is required";
    if (!form.officialEmail) next.officialEmail = "Official school email is required";
    else if (!EMAIL_RE.test(form.officialEmail)) next.officialEmail = "Enter a valid email address";
    if (!form.consent) next.consent = "You must confirm guardian consent to register your school";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await registerSchool({
        email: form.email,
        password: form.password,
        fullName: form.fullName.trim(),
        schoolName: form.schoolName.trim(),
        registrationNo: form.registrationNo.trim(),
        officialEmail: form.officialEmail.trim(),
        guardianConsent: form.consent,
      });
      if (!res.ok) {
        setFormError(res.error ?? "We could not register your school. Please try again.");
        return;
      }
      const profile = await signIn(form.email.trim(), form.password);
      if (!profile) {
        setFormError("Your school is registered. Please sign in with your email and password to continue.");
        navigate("/login", { replace: true });
        return;
      }
      // A new school is pending verification; the route guard also sends
      // school staff there, but go straight to it to skip a redirect.
      navigate(profile.role === "school_staff" ? "/pending-approval" : ROLE_HOME[profile.role], { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Register your school"
        description="Register your school on HanbeeLms. HANBEE verifies every school before students can join."
        path="/register-school"
      />
      <AuthLayout
        wide
        panelIcon={EnrollmentIcon}
        panelTitle="Bring your school onto the track"
        panelDescription="Register once, invite your students, form teams and follow their progress. HANBEE verifies each school first."
        accent="--color-teal"
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">Register your school</h1>
        <p className="mt-2 text-[15px] text-(--color-slate)">
          Tell us about your school. HANBEE checks the details before your school is activated.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <fieldset className="flex flex-col gap-5">
            <legend className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">About you</legend>
            <TextField label="Your full name" name="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} />
            <TextField label="Your email" type="email" name="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
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
          </fieldset>

          <fieldset className="mt-2 flex flex-col gap-5">
            <legend className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-(--color-mist)">About the school</legend>
            <TextField label="School name" name="schoolName" value={form.schoolName} onChange={set("schoolName")} error={errors.schoolName} />
            <TextField
              label="School registration number"
              name="registrationNo"
              value={form.registrationNo}
              onChange={set("registrationNo")}
              error={errors.registrationNo}
            />
            <TextField
              label="Official school email"
              type="email"
              name="officialEmail"
              placeholder="office@yourschool.edu"
              value={form.officialEmail}
              onChange={set("officialEmail")}
              error={errors.officialEmail}
            />
          </fieldset>

          <CheckboxField
            id="consent"
            checked={form.consent}
            onChange={(v) => setForm((f) => ({ ...f, consent: v }))}
            error={errors.consent}
          >
            On behalf of the school, I confirm that the school holds guardian consent for students under 18 to take part
            and be monitored on this platform for course participation.
          </CheckboxField>

          <FormAlert>{formError}</FormAlert>

          <button type="submit" disabled={submitting} className={`${primaryButtonClass} mt-1`}>
            {submitting ? "Registering..." : "Register school"}
          </button>
        </form>

        <p className="mt-6 text-sm text-(--color-slate)">
          Already registered?{" "}
          <Link to="/login" className={textLinkClass}>
            Sign in
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
