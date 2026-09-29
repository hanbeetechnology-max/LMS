"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import { joinSchool } from "../../../lib/teamFormationApi";

export default function JoinSchoolPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => setToken(new URLSearchParams(window.location.search).get("join_token") ?? ""), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await joinSchool(token);
      setMessage(`You're now connected to ${result.school}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't join this school.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Join your school</h1>
        <p className={styles.pageSubtitle}>Connect your existing student account to your school invitation.</p>
      </div>
      <form className={styles.sectionCard} onSubmit={submit}>
        <label htmlFor="school-join-token">School join link</label>
        <input id="school-join-token" value={token} onChange={(event) => setToken(event.target.value)} required maxLength={256} autoComplete="off" style={{ display: "block", width: "100%", margin: "12px 0" }} />
        <p style={{ color: "var(--text-muted)" }}>Use the email address that your school invited. The link only works after the school has invited that email.</p>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button className={styles.actionBtn} type="submit" disabled={busy || !token.trim()} style={{ marginTop: 16 }}>{busy ? "Joining…" : "Join school"}</button>
      </form>
    </div>
  );
}
