"use client";

import { FormEvent, useEffect, useState } from "react";
import { authenticatedSupabaseFetch, getAccountProfile, type AccountProfile } from "../../../../lib/supabaseAuth";
import styles from "../../dashboard.module.css";

type CalendarEvent = { id: string; title: string; event_type: "class_session" | "office_hours" | "other"; location: string; starts_at: string; ends_at: string; section_id: string | null };

export default function HanbeeSchedulePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["event_type"]>("other");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = profile?.role === "staff" || profile?.role === "manager";

  async function loadEvents() {
    const rows = await authenticatedSupabaseFetch<CalendarEvent[]>("/rest/v1/calendar_events?select=id,title,event_type,location,starts_at,ends_at,section_id&order=starts_at.asc");
    setEvents(rows);
  }
  useEffect(() => {
    let active = true;
    Promise.all([getAccountProfile(), authenticatedSupabaseFetch<CalendarEvent[]>("/rest/v1/calendar_events?select=id,title,event_type,location,starts_at,ends_at,section_id&order=starts_at.asc")])
      .then(([account, rows]) => { if (active) { setProfile(account); setEvents(rows); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the schedule."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) { setError("Choose an end time later than the start time."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/calendar_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ title: title.trim(), event_type: eventType, location: location.trim(), starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), created_by: profile.id }) });
      setTitle(""); setLocation(""); setStartsAt(""); setEndsAt(""); setMessage("Calendar event created."); await loadEvents();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't create this event."); }
    finally { setSaving(false); }
  }

  return <div><div className={styles.pageHeader}><h1 className={styles.pageTitle}>Hanbee Schedule</h1><p className={styles.pageSubtitle}>Published classes, office hours, and platform events</p></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {canManage && <form className={styles.sectionCard} onSubmit={createEvent} style={{ marginBottom: 24 }}><h2 className={styles.sectionTitle}>Add an event</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 16 }}>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} /></label>
      <label>Type<select value={eventType} onChange={(event) => setEventType(event.target.value as CalendarEvent["event_type"])}><option value="other">Other</option><option value="class_session">Class session</option><option value="office_hours">Office hours</option></select></label>
      <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={200} /></label>
      <label>Starts<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label>
      <label>Ends<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></label>
    </div><button type="submit" className={styles.actionBtn} disabled={saving} style={{ marginTop: 14 }}>{saving ? "Saving…" : "Add to schedule"}</button></form>}
    <div className={styles.sectionCard}><h2 className={styles.sectionTitle}>Upcoming events</h2>{loading ? <p role="status">Loading schedule…</p> : events.map((item) => <article key={item.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--border-subtle)" }}><h3>{item.title}</h3><p style={{ color: "var(--text-muted)", marginTop: 5 }}>{item.event_type.replaceAll("_", " ")} · {new Date(item.starts_at).toLocaleString()} – {new Date(item.ends_at).toLocaleTimeString()} {item.location && `· ${item.location}`}</p></article>)}{!loading && events.length === 0 && <p style={{ marginTop: 12 }}>No events have been scheduled.</p>}</div>
  </div>;
}