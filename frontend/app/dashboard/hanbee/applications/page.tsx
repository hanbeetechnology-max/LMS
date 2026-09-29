"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";

type Application = { id: string; course_id: string; course_title: string; applicant_id: string; applicant_name: string; school_name: string | null; status: string; payment_declared: boolean; created_at: string };
type Section = { id: string; course_id: string; name: string };
async function rpc<T>(name: string, args: Record<string, unknown> = {}) { return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) }); }

export default function HanbeeApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "manager" && profile.role !== "staff") throw new Error("Only approved Hanbee staff can review course applications.");
    const [rows, availableSections] = await Promise.all([
      rpc<Application[]>("list_course_applications"),
      authenticatedSupabaseFetch<Section[]>("/rest/v1/sections?select=id,course_id,name&order=name.asc"),
    ]);
    setApplications(rows.filter((row) => ["applied", "payment_declared"].includes(row.status)));
    setSections(availableSections);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load course applications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function decide(application: Application, decision: "verified" | "rejected") {
    const sectionId = selectedSections[application.id];
    if (decision === "verified" && !sectionId) { setError("Choose the course section before approving this application."); return; }
    setBusyId(application.id);
    setError("");
    setMessage("");
    try {
      await rpc("decide_course_application", { p_application: application.id, p_decision: decision, p_section: decision === "verified" ? sectionId : null });
      setMessage(decision === "verified" ? `${application.applicant_name} has been enrolled in ${application.course_title}.` : `Application for ${application.course_title} was declined.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't decide this application.");
    } finally { setBusyId(""); }
  }

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Course Applications</h1><p className={styles.pageSubtitle}>Review course requests and enroll students into a section</p></div>
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      {loading ? <p role="status">Loading applications…</p> : <div className={styles.sectionCard}>
        {applications.map((application) => {
          const choices = sections.filter((section) => section.course_id === application.course_id);
          return <article key={application.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <h2>{application.applicant_name} · {application.course_title}</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 5 }}>{application.school_name ?? "Independent student"} · {application.status.replaceAll("_", " ")} · Submitted {new Date(application.created_at).toLocaleDateString()}</p>
            {application.payment_declared && <p style={{ marginTop: 5 }}>Student has declared payment.</p>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <label>Enrollment section <select value={selectedSections[application.id] ?? ""} onChange={(event) => setSelectedSections((current) => ({ ...current, [application.id]: event.target.value }))}>
                <option value="">Choose a section</option>{choices.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select></label>
              <button type="button" className={styles.actionBtn} disabled={Boolean(busyId) || choices.length === 0} onClick={() => void decide(application, "verified")}>Approve and enroll</button>
              <button type="button" className={styles.actionBtn} disabled={Boolean(busyId)} onClick={() => void decide(application, "rejected")}>Decline</button>
            </div>
            {choices.length === 0 && <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Create a course section before approving this request.</p>}
          </article>;
        })}
        {applications.length === 0 && <p>No course applications are waiting for review.</p>}
      </div>}
    </div>
  );
}