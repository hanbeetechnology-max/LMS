"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile, type AccountProfile } from "../../../../lib/supabaseAuth";

type Course = { id: string; title: string; description: string; status: "draft" | "published" | "archived"; cover_accent: string; created_at: string };
export default function HanbeeCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = profile?.role === "staff" || profile?.role === "manager";

  const load = useCallback(async () => {
    const account = await getAccountProfile();
    if (account.role !== "staff" && account.role !== "manager") throw new Error("Only approved Hanbee staff can manage the course catalog.");
    const rows = await authenticatedSupabaseFetch<Course[]>("/rest/v1/courses?select=id,title,description,status,cover_accent,created_at&order=created_at.desc");
    setProfile(account);
    setCourses(rows);
  }, []);
  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load courses."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/courses", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ title: title.trim(), description: description.trim(), owner_id: profile.id, status: "draft" }) });
      setTitle(""); setDescription(""); setMessage("Draft course created."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't create the course."); }
    finally { setSaving(false); }
  }

  async function changeStatus(course: Course) {
    const next = course.status === "draft" ? "published" : course.status === "published" ? "archived" : "draft";
    setSaving(true); setError(""); setMessage("");
    try {
      const query = new URLSearchParams({ id: `eq.${course.id}` });
      await authenticatedSupabaseFetch<unknown>(`/rest/v1/courses?${query.toString()}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: next }) });
      setMessage(`${course.title} is now ${next}.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't update the course."); }
    finally { setSaving(false); }
  }

  return <div><div className={styles.pageHeader}><h1 className={styles.pageTitle}>Course Catalog</h1><p className={styles.pageSubtitle}>Create and publish learning content for students</p></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {canManage && <form className={styles.sectionCard} onSubmit={createCourse} style={{ marginBottom: 24 }}><h2 className={styles.sectionTitle}>Create a course</h2><div style={{ display: "grid", gap: 12, marginTop: 16 }}>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} /></label>
      <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={5000} /></label>
    </div><button type="submit" className={styles.actionBtn} disabled={saving} style={{ marginTop: 14 }}>{saving ? "Saving…" : "Create draft"}</button></form>}
    {loading ? <p role="status">Loading courses…</p> : <div style={{ display: "grid", gap: 14 }}>{courses.map((course) => <article key={course.id} className={styles.sectionCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}><div><h2 className={styles.sectionTitle}>{course.title}</h2><p style={{ color: "var(--text-muted)", marginTop: 8 }}>{course.description || "No description yet."}</p><p style={{ marginTop: 8 }}>Status: {course.status} · Created {new Date(course.created_at).toLocaleDateString()}</p></div><div style={{ display: "flex", gap: 10 }}><Link href={`/dashboard/courses/${encodeURIComponent(course.id)}`} className={styles.actionBtn}>Open course</Link>{canManage && <button type="button" className={styles.actionBtn} disabled={saving} onClick={() => void changeStatus(course)}>{course.status === "draft" ? "Publish" : course.status === "published" ? "Archive" : "Restore draft"}</button>}</div></div>
    </article>)}{courses.length === 0 && <div className={styles.sectionCard}>No courses are available yet.</div>}</div>}
  </div>;
}