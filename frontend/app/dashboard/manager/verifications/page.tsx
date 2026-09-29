"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";

type StaffApplication = { id: string; full_name: string; email: string; role: "staff"; created_at: string };
type SchoolApplication = { id: string; name: string; registration_no: string; official_email: string; created_by: string; created_at: string };

async function rpc(name: string, args: Record<string, unknown>) {
  return authenticatedSupabaseFetch<unknown>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export default function ManagerVerificationsPage() {
  const [staff, setStaff] = useState<StaffApplication[]>([]);
  const [schools, setSchools] = useState<SchoolApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isManager, setIsManager] = useState(false);

  const loadQueue = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "manager") throw new Error("Only a Hanbee manager can review applications.");
    setIsManager(true);
    const [staffRows, schoolRows] = await Promise.all([
      authenticatedSupabaseFetch<StaffApplication[]>("/rest/v1/profiles?select=id,full_name,email,role,created_at&role=eq.staff&approved=eq.false&account_status=eq.active&order=created_at.asc"),
      authenticatedSupabaseFetch<SchoolApplication[]>("/rest/v1/organizations?select=id,name,registration_no,official_email,created_by,created_at&status=eq.pending&order=created_at.asc"),
    ]);
    setStaff(staffRows);
    setSchools(schoolRows);
  }, []);

  useEffect(() => {
    let active = true;
    loadQueue().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the review queue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadQueue]);

  async function reviewStaff(application: StaffApplication, approve: boolean) {
    setBusyId(application.id);
    setError("");
    setMessage("");
    try {
      if (approve) {
        await authenticatedSupabaseFetch<unknown>(`/rest/v1/profiles?id=eq.${encodeURIComponent(application.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ approved: true }),
        });
      } else {
        await rpc("set_account_status", { p_user: application.id, p_status: "suspended", p_reason: "Staff application declined" });
      }
      setMessage(approve ? `${application.full_name} was approved.` : `${application.full_name}'s application was declined.`);
      await loadQueue();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this application.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewSchool(application: SchoolApplication, approve: boolean) {
    setBusyId(application.id);
    setError("");
    setMessage("");
    try {
      await rpc(approve ? "verify_school" : "reject_school", { p_org: application.id });
      setMessage(approve ? `${application.name} was approved.` : `${application.name}'s registration was declined.`);
      await loadQueue();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this school registration.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Application Reviews</h1><p className={styles.pageSubtitle}>Approve Hanbee staff and verify new school registrations</p></div>
      {error && <p role="alert" style={{ marginBottom: 16 }}>{error}</p>}
      {message && <p role="status" style={{ marginBottom: 16 }}>{message}</p>}
      {!isManager && !loading ? <div className={styles.sectionCard}>This review queue is available to Hanbee managers.</div> : null}
      {loading ? <p role="status">Loading applications…</p> : isManager && (
        <div className={styles.dashboardGrid}>
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Hanbee staff applications ({staff.length})</h2>
            {staff.length === 0 ? <p style={{ marginTop: 16, color: "var(--text-muted)" }}>No staff applications are waiting for review.</p> : staff.map((application) => (
              <article key={application.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <h3>{application.full_name}</h3><p style={{ color: "var(--text-muted)", marginTop: 4 }}>{application.email} · Submitted {new Date(application.created_at).toLocaleDateString()}</p>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button type="button" className={styles.actionBtn} disabled={Boolean(busyId)} onClick={() => void reviewStaff(application, true)}><Check size={16} /> Approve</button>
                  <button type="button" className={styles.actionBtn} disabled={Boolean(busyId)} onClick={() => void reviewStaff(application, false)}><X size={16} /> Decline</button>
                </div>
              </article>
            ))}
          </section>
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>School registrations ({schools.length})</h2>
            {schools.length === 0 ? <p style={{ marginTop: 16, color: "var(--text-muted)" }}>No schools are waiting for verification.</p> : schools.map((school) => (
              <article key={school.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <h3>{school.name}</h3><p style={{ color: "var(--text-muted)", marginTop: 4 }}>Registration {school.registration_no} · {school.official_email}</p>
                <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Submitted {new Date(school.created_at).toLocaleDateString()}</p>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button type="button" className={styles.actionBtn} disabled={Boolean(busyId)} onClick={() => void reviewSchool(school, true)}><Check size={16} /> Verify school</button>
                  <button type="button" className={styles.actionBtn} disabled={Boolean(busyId)} onClick={() => void reviewSchool(school, false)}><X size={16} /> Decline</button>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
