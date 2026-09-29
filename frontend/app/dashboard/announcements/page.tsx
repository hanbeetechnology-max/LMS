"use client";

import { FormEvent, useEffect, useState } from "react";
import { Info } from "lucide-react";
import styles from "./announcements.module.css";
import { getAccountProfile, type AccountProfile } from "../../../lib/supabaseAuth";
import { fetchMyOrganizationId } from "../../../lib/teamFormationApi";
import { createAnnouncement, deleteAnnouncement, getAnnouncementAuthors, listAnnouncements, updateAnnouncement, type AnnouncementAudience, type AnnouncementAuthor, type AnnouncementRow } from "../../../lib/announcementsApi";

type AudienceFilter = "all" | "staff" | "student";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [authors, setAuthors] = useState<Map<string, AnnouncementAuthor>>(new Map());
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AudienceFilter>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const rows = await listAnnouncements();
    const people = await getAnnouncementAuthors([...new Set(rows.map((row) => row.author_id))]);
    setAnnouncements(rows);
    setAuthors(new Map(people.map((person) => [person.id, person])));
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const account = await getAccountProfile();
        const [rows, orgId] = await Promise.all([
          listAnnouncements(),
          account.role === "school_staff" ? fetchMyOrganizationId() : Promise.resolve(null),
        ]);
        const people = await getAnnouncementAuthors([...new Set(rows.map((row) => row.author_id))]);
        if (!active) return;
        setProfile(account);
        setOrganizationId(orgId);
        setAnnouncements(rows);
        setAuthors(new Map(people.map((person) => [person.id, person])));
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load announcements.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  const canPublish = profile?.role === "manager" || profile?.role === "staff" || profile?.role === "school_staff";
  const isSchoolStaff = profile?.role === "school_staff";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        await updateAnnouncement(editingId, { title: title.trim(), body: body.trim(), audience });
        setNotice("Announcement updated.");
      } else {
        await createAnnouncement({ org_id: isSchoolStaff ? organizationId : null, title: title.trim(), body: body.trim(), audience });
        setNotice(isSchoolStaff ? "School announcement published." : "Site announcement published.");
      }
      setTitle("");
      setBody("");
      setAudience("all");
      setEditingId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save this announcement.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(row: AnnouncementRow) {
    setEditingId(row.id);
    setTitle(row.title);
    setBody(row.body);
    setAudience(row.audience);
    setNotice("");
  }

  async function remove(row: AnnouncementRow) {
    if (!window.confirm(`Delete “${row.title}”?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteAnnouncement(row.id);
      setAnnouncements((current) => current.filter((item) => item.id !== row.id));
      if (editingId === row.id) {
        setEditingId(null);
        setTitle("");
        setBody("");
      }
      setNotice("Announcement deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't delete this announcement.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePinned(row: AnnouncementRow) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateAnnouncement(row.id, { title: row.title, body: row.body, audience: row.audience, pinned: !row.pinned });
      setNotice(row.pinned ? "Announcement unpinned." : "Announcement pinned to the top.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't change the announcement pin.");
    } finally {
      setBusy(false);
    }
  }

  const visibleAnnouncements = filter === "all"
    ? announcements
    : announcements.filter((item) => item.audience === "all" || item.audience === filter);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Announcements</h1>
        <p className={styles.pageSubtitle}>{isSchoolStaff ? "Updates shared with your school" : "Staff and manager updates for your account"}</p>
      </div>
      {canPublish && <form onSubmit={submit} style={{ marginBottom: 28, padding: 22, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>{editingId ? "Edit announcement" : isSchoolStaff ? "Post to your school" : "Publish site announcement"}</h2>
        <label htmlFor="announcement-title">Title</label>
        <input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} style={{ display: "block", width: "100%", margin: "6px 0 14px" }} />
        <label htmlFor="announcement-body">Message</label>
        <textarea id="announcement-body" value={body} onChange={(event) => setBody(event.target.value)} required maxLength={12000} rows={5} style={{ display: "block", width: "100%", margin: "6px 0 14px" }} />
        <label htmlFor="announcement-audience">Audience</label>
        <select id="announcement-audience" value={audience} onChange={(event) => setAudience(event.target.value as AnnouncementAudience)} style={{ display: "block", margin: "6px 0 14px" }}>
          <option value="all">Everyone in this scope</option><option value="student">Students</option><option value="staff">School staff</option>
        </select>
        <button type="submit" disabled={busy || (isSchoolStaff && !organizationId)}>{busy ? "Saving…" : editingId ? "Save changes" : "Publish announcement"}</button>
        {editingId && <button type="button" disabled={busy} onClick={() => { setEditingId(null); setTitle(""); setBody(""); }}>Cancel edit</button>}
      </form>}
      {error && <p role="alert" style={{ marginBottom: 16 }}>{error}</p>}
      {notice && <p role="status" style={{ marginBottom: 16 }}>{notice}</p>}
      <div className={styles.tabs} role="group" aria-label="Filter announcements by audience">
        {(["all", "student", "staff"] as const).map((target) => <button key={target} type="button" className={`${styles.tabBtn} ${filter === target ? styles.tabBtnActive : ""}`} onClick={() => setFilter(target)}>{target === "all" ? "All" : target === "student" ? "Students" : "Staff"}</button>)}
      </div>
      <div className={styles.announcementsList}>
        {loading && <p role="status">Loading announcements…</p>}
        {!loading && !error && visibleAnnouncements.length === 0 && <p>No announcements to show.</p>}
        {visibleAnnouncements.map((item) => {
          const author = authors.get(item.author_id);
          const canEdit = profile?.role === "manager" || item.author_id === profile?.id || (isSchoolStaff && item.org_id === organizationId);
          const authorRole = author?.role.replaceAll("_", " ") ?? "Hanbee staff";
          return <article key={item.id} className={styles.announcementCard}>
            <div className={styles.cardHeader}>
              <div className={`${styles.avatar} ${author?.role === "staff" ? styles.avatarStaff : styles.avatarManager}`}>{(author?.full_name ?? "H").charAt(0)}</div>
              <div className={styles.authorName}>{author?.full_name ?? "Hanbee staff"}</div>
              <div className={`${styles.roleBadge} ${author?.role === "staff" ? styles.roleStaff : styles.roleManager}`}>{authorRole}</div>
              <time className={styles.time} dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
            </div>
            <h2 className={styles.title}><Info size={18} aria-hidden="true" /> {item.title}</h2>
            <div className={styles.content} style={{ whiteSpace: "pre-wrap" }}>{item.body}</div>
            <div className={styles.tags}><span className={styles.tag}>{item.audience === "all" ? "EVERYONE" : item.audience.toUpperCase()}</span><span className={styles.tag}>{item.org_id ? "SCHOOL" : "HANBEE"}</span></div>
            {item.pinned && <div className={styles.pinnedBadge}>Pinned</div>}
            {canEdit && <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button type="button" disabled={busy} onClick={() => void togglePinned(item)}>{item.pinned ? "Unpin" : "Pin"}</button><button type="button" disabled={busy} onClick={() => beginEdit(item)}>Edit</button><button type="button" disabled={busy} onClick={() => void remove(item)}>Delete</button></div>}
          </article>;
        })}
      </div>
    </div>
  );
}
