"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile, type AccountProfile } from "../../../lib/supabaseAuth";
import { fetchMyOrganizationId } from "../../../lib/teamFormationApi";

type CalendarEvent = { id: string; title: string; event_type: string; location: string; starts_at: string; ends_at: string; section_id: string | null; org_id: string | null; owner_id: string | null };
type Range = "day" | "week" | "month";

function rangeStart(range: Range) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (range === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (range === "month") start.setDate(1);
  return start;
}
function rangeEnd(range: Range) {
  const end = rangeStart(range);
  if (range === "day") end.setDate(end.getDate() + 1);
  if (range === "week") end.setDate(end.getDate() + 7);
  if (range === "month") end.setMonth(end.getMonth() + 1);
  return end;
}

export default function SchoolSchedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("week");
  const [scope, setScope] = useState<"all" | "school" | "personal">("all");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [eventScope, setEventScope] = useState<"school" | "personal">("school");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      getAccountProfile(),
      fetchMyOrganizationId(),
      authenticatedSupabaseFetch<CalendarEvent[]>("/rest/v1/calendar_events?select=id,title,event_type,location,starts_at,ends_at,section_id,org_id,owner_id&order=starts_at.asc"),
    ]).then(([account, orgId, rows]) => {
      if (!active) return;
      setProfile(account); setOrganizationId(orgId); setEvents(rows);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the school schedule."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleEvents = useMemo(() => {
    const start = rangeStart(range); const end = rangeEnd(range);
    return events.filter((event) => {
      const at = new Date(event.starts_at);
      const inScope = scope === "all" || (scope === "school" ? Boolean(event.org_id) : event.owner_id === profile?.id);
      return inScope && at >= start && at < end;
    });
  }, [events, profile?.id, range, scope]);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (!profile || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) { setError("Choose an end time later than the start time."); return; }
    if (eventScope === "school" && !organizationId) { setError("Your account is not linked to an active school."); return; }
    setSaving(true);
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/calendar_events", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title: title.trim(), event_type: "other", location: location.trim(), starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), org_id: eventScope === "school" ? organizationId : null, owner_id: eventScope === "personal" ? profile.id : null }) });
      const rows = await authenticatedSupabaseFetch<CalendarEvent[]>("/rest/v1/calendar_events?select=id,title,event_type,location,starts_at,ends_at,section_id,org_id,owner_id&order=starts_at.asc");
      setEvents(rows); setTitle(""); setLocation(""); setStartsAt(""); setEndsAt(""); setNotice(`${eventScope === "school" ? "School" : "Personal"} event added to your schedule.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't create this event."); }
    finally { setSaving(false); }
  }

  return <div>
    <div className={styles.pageHeader}><h1 className={styles.pageTitle}>School Schedule</h1><p className={styles.pageSubtitle}>Plan school events and see your personal calendar together</p></div>
    {error && <p role="alert" style={{ marginBottom: 12 }}>{error}</p>}{notice && <p role="status" style={{ marginBottom: 12 }}>{notice}</p>}
    <form className={styles.sectionCard} onSubmit={createEvent} style={{ marginBottom: 20 }}>
      <h2 className={styles.sectionTitle}>Add an event</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 14 }}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} /></label>
        <label>Calendar<select value={eventScope} onChange={(event) => setEventScope(event.target.value as "school" | "personal")}><option value="school">School</option><option value="personal">Personal</option></select></label>
        <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={200} /></label>
        <label>Starts<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label>
        <label>Ends<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></label>
      </div>
      <button type="submit" className={styles.actionBtn} disabled={saving || !profile} style={{ marginTop: 14 }}>{saving ? "Saving…" : "Add to schedule"}</button>
    </form>
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Calendar</h2><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select aria-label="Calendar view" value={range} onChange={(event) => setRange(event.target.value as Range)}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select>
        <select aria-label="Calendar scope" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="all">School and personal</option><option value="school">School only</option><option value="personal">Personal only</option></select>
      </div></div>
      {loading ? <p role="status">Loading schedule…</p> : visibleEvents.map((item) => <article key={item.id} style={{ padding: "15px 0", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h3>{item.title}</h3><p style={{ color: "var(--text-muted)", marginTop: 5 }}>{item.org_id ? "School event" : "Personal event"}{item.location && ` · ${item.location}`}</p></div><time dateTime={item.starts_at}>{new Date(item.starts_at).toLocaleString()} – {new Date(item.ends_at).toLocaleTimeString()}</time></div>
      </article>)}
      {!loading && visibleEvents.length === 0 && <p style={{ marginTop: 14, color: "var(--text-muted)" }}>No events in this calendar range.</p>}
    </section>
  </div>;
}
