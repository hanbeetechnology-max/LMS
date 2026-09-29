"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { getAccountProfile } from "../../../lib/supabaseAuth";
import { createTournament, listTournaments, updateTournament, type TournamentRecord, type TournamentStatus } from "../../../lib/tournamentAdminApi";

type TournamentForm = { title: string; description: string; startsAt: string; endsAt: string; venue: string; status: TournamentStatus };
const blank: TournamentForm = { title: "", description: "", startsAt: "", endsAt: "", venue: "", status: "upcoming" };
const localInputValue = (value: string) => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<TournamentForm>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "staff" && profile.role !== "manager") throw new Error("Only Hanbee staff and managers can manage tournaments.");
    setTournaments(await listTournaments());
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tournaments."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  function edit(row: TournamentRecord) {
    setEditingId(row.id);
    setForm({ title: row.title, description: row.description, startsAt: localInputValue(row.starts_at), endsAt: localInputValue(row.ends_at), venue: row.venue, status: row.status });
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsAt = new Date(form.startsAt);
    const endsAt = new Date(form.endsAt);
    if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf()) || endsAt < startsAt) {
      setError("Enter valid dates and make sure the tournament ends after it starts.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const common = { title: form.title.trim(), description: form.description.trim(), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), venue: form.venue.trim() };
      if (editingId) {
        const current = tournaments.find((item) => item.id === editingId);
        if (!current) throw new Error("This tournament is no longer available.");
        await updateTournament({ ...current, ...common, status: form.status });
        setNotice("Tournament updated.");
      } else {
        await createTournament(common);
        setNotice("Tournament created.");
      }
      setEditingId("");
      setForm(blank);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save this tournament.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Tournament management</h2>
        <p className={styles.pageSubtitle}>Create the next event and manage event dates and status.</p>
      </div>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <form className={styles.sectionCard} onSubmit={submit} style={{ marginBottom: 20 }}>
        <h3>{editingId ? "Edit tournament" : "Create tournament"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={180} /></label>
          <label>Venue<input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} maxLength={240} /></label>
          <label>Starts<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label>
          <label>Ends<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required /></label>
          {editingId && <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TournamentStatus })}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="completed">Completed</option></select></label>}
        </div>
        <label style={{ display: "block", marginTop: 12 }}>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={4000} rows={3} style={{ display: "block", width: "100%" }} /></label>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}><button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save tournament" : "Create tournament"}</button>{editingId && <button type="button" disabled={saving} onClick={() => { setEditingId(""); setForm(blank); }}>Cancel</button>}</div>
      </form>
      {loading ? <p role="status">Loading tournament list…</p> : <div style={{ display: "grid", gap: 12 }}>
        {tournaments.map((row) => <article key={row.id} className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h3>{row.title}</h3><p style={{ color: "var(--text-muted)" }}>{new Date(row.starts_at).toLocaleString()} – {new Date(row.ends_at).toLocaleString()}</p><p>{row.venue || "Venue not set"} · {row.team_size} per team · {row.status}</p></div><button type="button" disabled={saving} onClick={() => edit(row)}>Edit</button></div>
          {row.description && <p style={{ marginTop: 10 }}>{row.description}</p>}
        </article>)}
        {tournaments.length === 0 && <p>No tournaments have been created.</p>}
      </div>}
    </section>
  );
}
