import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { AuthLayout } from "../../layouts/AuthLayout";
import { EnrollmentIcon } from "../../components/landing/icons";

/** Small shared pieces for the auth pages. */

export const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function validatePasswordPair(password: string, confirm: string): { password?: string; confirmPassword?: string } {
  const out: { password?: string; confirmPassword?: string } = {};
  if (!password) out.password = "Password is required";
  else if (password.length < 8) out.password = "Use at least 8 characters";
  if (confirm !== password) out.confirmPassword = "Passwords don't match";
  return out;
}

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-ink) px-6 py-3 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-line) px-6 py-3 text-sm font-semibold text-(--color-ink-soft) transition-colors duration-300 hover:border-(--color-ink) hover:text-(--color-ink)";

export const textLinkClass = "font-medium text-(--color-ink) transition-colors hover:text-(--color-violet)";

export function FormAlert({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-(--color-error-soft) px-4 py-3 text-sm text-(--color-error)">
      {children}
    </p>
  );
}

export function CheckboxField({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-relaxed text-(--color-ink-soft)">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 h-5 w-5 shrink-0 rounded border-(--color-line) accent-(--color-violet)"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-(--color-error)">
          {error}
        </p>
      )}
    </div>
  );
}

/** A full-page notice (invalid link, closed state) in the auth look. */
export function NoticePage({
  title,
  body,
  seoTitle,
  path,
  actionLabel = "Back to home",
  actionTo = "/",
}: {
  title: string;
  body: string;
  seoTitle: string;
  path: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <>
      <Seo title={seoTitle} description={body} path={path} />
      <AuthLayout panelIcon={EnrollmentIcon} panelTitle="HanbeeLms" panelDescription="Schools, students and the HANBEE team on one platform.">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-(--color-ink)">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-(--color-slate)">{body}</p>
        <Link to={actionTo} className={`${primaryButtonClass} mt-8`}>
          {actionLabel}
        </Link>
      </AuthLayout>
    </>
  );
}
