"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Mail, TriangleAlert } from "lucide-react";
import { requestPasswordReset, updatePassword } from "../../../lib/supabaseAuth";
import styles from "../login/login.module.css";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery") setAccessToken(hash.get("access_token") ?? "");
    const recoveryError = hash.get("error_description");
    if (recoveryError) setError(recoveryError.replaceAll("+", " "));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (accessToken && password !== confirmPassword) {
      setError("The passwords don't match. Check them and try again.");
      return;
    }
    setSubmitting(true);
    try {
      if (accessToken) {
        await updatePassword(accessToken, password);
        window.history.replaceState(null, "", window.location.pathname);
        setAccessToken("");
        setMessage("Your password has been updated. Sign in with your new password.");
      } else {
        await requestPasswordReset(email);
        setMessage("If an account exists for that address, Supabase will send a password reset link.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't update your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.bgImage} aria-hidden="true" />
      <div className={styles.ambientGlow} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="reset-title">
        <h1 className={styles.title} id="reset-title">{accessToken ? "Choose a new password" : "Reset your password"}</h1>
        <p className={styles.subtitle}>
          {accessToken ? "Set a new password for your Hanbee account." : "We’ll email you a secure link to choose a new password."}
        </p>
        <form className={styles.form} onSubmit={handleSubmit}>
          {!accessToken ? (
            <>
              <label className={styles.label} htmlFor="recovery-email">Email address</label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} size={18} aria-hidden="true" />
                <input className={styles.input} id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} disabled={submitting} />
              </div>
            </>
          ) : (
            <>
              <label className={styles.label} htmlFor="new-password">New password</label>
              <div className={styles.inputWrap}>
                <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
                <input className={styles.input} id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} disabled={submitting} />
              </div>
              <label className={`${styles.label} ${styles.spacedLabel}`} htmlFor="confirm-new-password">Confirm new password</label>
              <div className={styles.inputWrap}>
                <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
                <input className={styles.input} id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} disabled={submitting} />
              </div>
            </>
          )}
          {error && <p className={styles.errorMessage} role="alert"><TriangleAlert size={16} aria-hidden="true" /> {error}</p>}
          {message && <div className={styles.successMessage} role="status"><p>{message}</p></div>}
          {!message.startsWith("Your password has been updated") && (
            <button className={styles.submitButton} type="submit" disabled={submitting}>
              {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
              {submitting ? "Please wait…" : accessToken ? "Update password" : "Send reset link"}
            </button>
          )}
        </form>
        <p className={styles.footerText}><Link href="/login" className={styles.footerLink}>Back to sign in</Link></p>
      </section>
    </main>
  );
}
