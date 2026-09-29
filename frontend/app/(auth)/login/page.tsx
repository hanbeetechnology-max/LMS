"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, Mail, TriangleAlert } from "lucide-react";
import { AUTH_SESSION_KEY, signInWithPassword, type HanbeeRole } from "../../../lib/supabaseAuth";
import AuthTabs from "../../../components/auth/AuthTabs";
import styles from "./login.module.css";

const ROLE_HOME: Record<HanbeeRole, string> = {
  student: "/dashboard",
  school_staff: "/dashboard/school/overview",
  staff: "/dashboard/hanbee/my-space",
  manager: "/dashboard/manager/monitor",
};

export default function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState(false);
  const [workspaceRole, setWorkspaceRole] = useState<"student" | "staff" | "manager">("student");

  useEffect(() => {
    setConfirmationNotice(new URLSearchParams(window.location.search).get("signup") === "confirmed");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPendingApproval(false);
    setSubmitting(true);

    try {
      const result = await signInWithPassword(email, password);
      const roleMatches = workspaceRole === "staff"
        ? result.role === "staff" || result.role === "school_staff"
        : result.role === workspaceRole;
      if (!roleMatches) {
        const accountWorkspace = result.role === "school_staff" ? "school staff" : result.role;
        setError(`This account belongs to the ${accountWorkspace} workspace. Select that workspace and try again.`);
        return;
      }
      if ((result.role === "staff" || result.role === "school_staff") && !result.approved) {
        setPendingApproval(true);
        return;
      }

      window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result.session));
      const requested = new URLSearchParams(window.location.search).get("next");
      const next = requested && requested.startsWith("/dashboard/") && !requested.startsWith("//")
        ? requested
        : ROLE_HOME[result.role];
      router.replace(next);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't connect to the sign-in service. Please try again.",
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
        aria-labelledby="login-title"
      >
        <h1 className={styles.title} id="login-title">Welcome back</h1>
        <p className={styles.subtitle}>Access your race and learning workspace.</p>
        <AuthTabs active="login" />
        <div className={styles.rolePicker}>
          <span className={styles.roleHeading}>SELECT ROLE</span>
          <div className={styles.roleOptions} role="tablist" aria-label="Choose a workspace">
            {(["student", "staff", "manager"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={workspaceRole === item} className={workspaceRole === item ? styles.roleActive : ""} onClick={() => setWorkspaceRole(item)}>{item === "staff" ? "Staff" : item === "manager" ? "Manager" : "Student"}</button>)}
          </div>
        </div>

        {confirmationNotice && (
          <div className={styles.successMessage} role="status">
            <p>Your email has been confirmed. Sign in to continue.</p>
          </div>
        )}

        {pendingApproval ? (
          <div className={styles.notice} role="status">
            <span className={styles.noticeIcon}><LockKeyhole size={18} /></span>
            <div>
              <strong>Application under review</strong>
              <p>Your account is waiting for approval. You can sign in after a manager or Hanbee staff member approves it.</p>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.visuallyHidden} htmlFor="email">Email address</label>
            <div className={styles.inputWrap}>
              <Mail className={styles.inputIcon} size={18} aria-hidden="true" />
              <input
                className={styles.input}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                disabled={submitting}
              />
            </div>

            <div className={styles.passwordHeading}>
              <label className={styles.visuallyHidden} htmlFor="password">Password</label>
            </div>
            <div className={styles.inputWrap}>
              <LockKeyhole className={styles.inputIcon} size={18} aria-hidden="true" />
              <input
                className={styles.input}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
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
            <div className={styles.recoveryRow}><Link href="/reset-password" className={styles.subtleLink}>Forgot Password?</Link></div>

            {error && (
              <p className={styles.errorMessage} role="alert">
                <TriangleAlert size={16} aria-hidden="true" /> {error}
              </p>
            )}

            <button className={styles.submitButton} type="submit" disabled={submitting}>
              {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
              {submitting ? "Signing in…" : "Launch Workspace"}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>
        )}

      </motion.section>
    </main>
  );
}
