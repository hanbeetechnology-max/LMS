"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AUTH_SESSION_KEY, getCurrentAccount, readStoredSession, type SupabaseSession } from "../lib/supabaseAuth";

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const session = readStoredSession();
      if (!session) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      try {
        const account = await getCurrentAccount(session);
        if (!active) return;
        if ((account.role === "staff" || account.role === "school_staff") && !account.approved) {
          window.localStorage.removeItem(AUTH_SESSION_KEY);
          setMessage("Your account is waiting for approval. You can sign in after a manager or Hanbee staff member approves it.");
          return;
        }
        window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(account.session));
        setReady(true);
      } catch (error) {
        if (!active) return;
        const expiredSession = error instanceof Error && /refresh token|invalid jwt|unauthorized/i.test(error.message);
        if (expiredSession) {
          window.localStorage.removeItem(AUTH_SESSION_KEY);
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setMessage(error instanceof Error ? error.message : "We couldn't verify your session.");
      }
    }

    void restoreSession();
    return () => { active = false; };
  }, [router]);

  if (message) {
    return (
      <main role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div>
          <p>{message}</p>
          <button type="button" onClick={() => router.replace("/login")}>Return to sign in</button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return <main role="status" aria-live="polite" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking your account…</main>;
  }

  return children;
}
