"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { signUpWithPassword } from "../../../lib/supabaseAuth";
import AuthTabs from "../../../components/auth/AuthTabs";
import styles from "./signup.module.css";

type SignupRole = "student" | "school_staff" | "staff";

export default function SignupPage() {
  const reduceMotion = useReducedMotion();
  const [role, setRole] = useState<SignupRole>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInviteToken(params.get("invite_token") ?? "");
    setJoinToken(params.get("join_token") ?? "");
    setEmail(params.get("email") ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    if (role === "student" && !inviteToken.trim() && !joinToken.trim()) {
      setError("Student accounts are invitation-only. Open your school's join link or use the personal invitation code you received.");
      return;
    }
    if (inviteToken.trim() && joinToken.trim()) {
      setError("Use either a personal invitation or a school join link, not both.");
      return;
    }
    if (role === "school_staff" && !guardianConsent) {
      setError("Confirm that you are authorized to submit this school registration and have obtained any required guardian consent.");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords don't match. Check them and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUpWithPassword({
        fullName,
        email,
        password,
        role,
        ...(inviteToken.trim() ? { inviteToken: inviteToken.trim() } : {}),
        ...(joinToken.trim() ? { joinToken: joinToken.trim() } : {}),
        ...(role === "school_staff" ? { schoolName, registrationNo, officialEmail, guardianConsent } : {}),
      });
      if (role === "staff" || role === "school_staff") {
        setSuccessMessage(role === "staff"
          ? "Your Hanbee staff application is submitted. Confirm your email, then a manager must approve it before you can sign in."
          : "Your school registration is submitted for review. Confirm your email; a Hanbee manager must approve the school before you can sign in.");
      } else if (!result.access_token) {
        setSuccessMessage("Your account has been created. Check your email to confirm the address before signing in.");
      } else {
        setSuccessMessage("Your account has been created. You can now sign in with your email and password.");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't connect to the sign-up service. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.bgImage} aria-hidden="true" />
      <div className={styles.ambientGlow} aria-hidden="true" />
      <motion.section
        className={styles.card}
        initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.2, 0.65, 0.3, 0.9] }}
        aria-labelledby="signup-title"
      >
        <h1 className={styles.title} id="signup-title">Create your account</h1>
        <p className={styles.subtitle}>One account for the track, the classroom, and everything you build next.</p>
        <AuthTabs active="signup" />

        <form className={styles.form} onSubmit={handleSubmit}>
          <fieldset className={styles.roleFieldset}>
            <legend className={styles.label}>I am joining as</legend>
            <div className={styles.roleOptions}>
              <button
                className={`${styles.roleOption} ${role === "student" ? styles.roleOptionActive : ""}`}
                type="button"
                role="radio"
                aria-checked={role === "student"}
                onClick={() => setRole("student")}
              >
                Student
                <span>Start learning and racing</span>
              </button>
              <button
                className={`${styles.roleOption} ${role === "school_staff" ? styles.roleOptionActive : ""}`}
                type="button"
                role="radio"
                aria-checked={role === "school_staff"}
                onClick={() => setRole("school_staff")}
              >
                School staff
                <span>Register your school</span>
              </button>
              <button
                className={`${styles.roleOption} ${role === "staff" ? styles.roleOptionActive : ""}`}
                type="button"
                role="radio"
                aria-checked={role === "staff"}
                onClick={() => setRole("staff")}
              >
                Hanbee staff
                <span>Apply for team access</span>
              </button>
            </div>
          </fieldset>

          <label className={styles.label} htmlFor="full-name">Full name</label>
          <div className={styles.inputWrap}>
            <UserRound className={styles.inputIcon} size={18} aria-hidden="true" />
            <input
              className={styles.input}
              id="full-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
              disabled={submitting}
            />
          </div>

          <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="signup-email">Email address</label>
          <div className={styles.inputWrap}>
            <Mail className={styles.inputIcon} size={18} aria-hidden="true" />
            <input
              className={styles.input}
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              disabled={submitting}
            />
          </div>

          {role === "student" && (
            <>
              <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="signup-invite-token">Personal invitation code</label>
              <div className={styles.inputWrap}>
                <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
                <input
                  className={styles.input}
                  id="signup-invite-token"
                  name="invite_token"
                  type="text"
                  autoComplete="off"
                  placeholder="Paste your invitation code"
                  value={inviteToken}
                  onChange={(event) => setInviteToken(event.target.value)}
                  disabled={submitting || Boolean(joinToken)}
                />
              </div>
              <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="signup-join-token">Or school join link code</label>
              <div className={styles.inputWrap}>
                <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
                <input
                  className={styles.input}
                  id="signup-join-token"
                  name="join_token"
                  type="text"
                  autoComplete="off"
                  placeholder="Paste your school's join code"
                  value={joinToken}
                  onChange={(event) => setJoinToken(event.target.value)}
                  disabled={submitting || Boolean(inviteToken)}
                />
              </div>
            </>
          )}

          {role === "school_staff" && (
            <>
              <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="school-name">School name</label>
              <div className={styles.inputWrap}>
                <UserRound className={styles.inputIcon} size={18} aria-hidden="true" />
                <input className={styles.input} id="school-name" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required maxLength={160} disabled={submitting} />
              </div>
              <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="registration-number">School registration number</label>
              <div className={styles.inputWrap}>
                <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
                <input className={styles.input} id="registration-number" value={registrationNo} onChange={(event) => setRegistrationNo(event.target.value)} required maxLength={100} disabled={submitting} />
              </div>
              <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="official-email">Official school email</label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} size={18} aria-hidden="true" />
                <input className={styles.input} id="official-email" type="email" autoComplete="email" value={officialEmail} onChange={(event) => setOfficialEmail(event.target.value)} required maxLength={254} disabled={submitting} />
              </div>
              <label className={styles.consentLabel}>
                <input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} disabled={submitting} />
                I confirm I am authorized to submit this school registration, that I have read the{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</a>, and that any
                required guardian consent for the students I plan to invite has been obtained.
              </label>
              <p className={styles.applicationNote}>School registrations remain pending until verified by a Hanbee manager.</p>
            </>
          )}

          <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="signup-password">Password</label>
          <div className={styles.inputWrap}>
            <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
            <input
              className={styles.input}
              id="signup-password"
              name="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={submitting}
            />
            <button
              className={styles.visibilityButton}
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="confirm-password">Confirm password</label>
          <div className={styles.inputWrap}>
            <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
            <input
              className={styles.input}
              id="confirm-password"
              name="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter your password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              disabled={submitting}
            />
          </div>

          {role === "staff" && (
            <p className={styles.applicationNote}>
              Hanbee staff accounts require manager approval. Choosing this option submits an application; it does not grant staff access.
            </p>
          )}
          {role === "student" && (
            <p className={styles.applicationNote}>
              Enter the code from your personal invitation or school join link. Your email must match the invitation.
            </p>
          )}
          {error && <p className={styles.errorMessage} role="alert">{error}</p>}
          {successMessage && (
            <div className={styles.successMessage} role="status">
              <strong>{role === "student" ? "Account update" : "Application submitted"}</strong>
              <p>{successMessage}</p>
            </div>
          )}

          <button className={styles.submitButton} type="submit" disabled={submitting}>
            {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {submitting ? "Creating account…" : role === "student" ? "Create student account" : role === "staff" ? "Submit staff application" : "Register school"}
            {!submitting && <span aria-hidden="true">↗</span>}
          </button>
        </form>

      </motion.section>
    </main>
  );
}
