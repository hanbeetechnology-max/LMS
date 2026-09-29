"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveTeamApplication,
  fetchMyOrganizationId,
  fetchSchoolTeamOverview,
  fetchTeamSlotStatus,
  fetchUpcomingTournament,
  returnTeamForChanges,
  setSchoolTeamSlots,
  type SchoolTeamOverview,
  type TeamSlotStatus,
  type UpcomingTournament,
} from "../../../../lib/teamFormationApi";

export default function SchoolTeams() {
  const [organizationId, setOrganizationId] = useState("");
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [teams, setTeams] = useState<SchoolTeamOverview[]>([]);
  const [slots, setSlots] = useState<TeamSlotStatus | null>(null);
  const [slotInput, setSlotInput] = useState("1");
  const [paymentConfirmed, setPaymentConfirmed] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const orgId = await fetchMyOrganizationId();
      setOrganizationId(orgId ?? "");
      const nextTournament = await fetchUpcomingTournament();
      setTournament(nextTournament);
      if (!orgId || !nextTournament) {
        setTeams([]);
        setSlots(null);
        return;
      }
      const [nextTeams, nextSlots] = await Promise.all([
        fetchSchoolTeamOverview(nextTournament.id, orgId),
        fetchTeamSlotStatus(nextTournament.id, orgId),
      ]);
      setTeams(nextTeams);
      setSlots(nextSlots);
      setSlotInput(String(nextSlots?.max_teams ?? 1));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load school teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The update was refused.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status">Loading school teams…</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Teams</h1>
      <p style={{ marginBottom: 20, color: "var(--text-muted)" }}>
        {tournament ? `${tournament.title} · ${tournament.team_size} players per school team` : "No upcoming tournament is open for team formation."}
      </p>

      {error && <p role="alert" style={{ color: "#b42318", marginBottom: 14 }}>{error}</p>}
      {notice && <p role="status" style={{ marginBottom: 14 }}>{notice}</p>}

      {organizationId && tournament && (
        <section style={{ padding: 20, marginBottom: 20, background: "var(--bg-card)", borderRadius: 16 }}>
          <h2 style={{ marginBottom: 8 }}>Team slots</h2>
          <p style={{ marginBottom: 12, color: "var(--text-muted)" }}>
            {slots?.used ?? 0} of {slots?.max_teams ?? "no limit set"} slots used · team size {tournament.team_size}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const count = Number(slotInput);
              if (Number.isInteger(count) && count >= 1 && count <= 20) {
                void runAction(() => setSchoolTeamSlots(tournament.id, organizationId, count), "Team slots updated.");
              }
            }}
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
          >
            <label htmlFor="team-slots">Maximum teams</label>
            <input id="team-slots" type="number" min={1} max={20} value={slotInput} onChange={(event) => setSlotInput(event.target.value)} required disabled={busy} />
            <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save slots"}</button>
          </form>
        </section>
      )}

      {!organizationId && <p role="alert">No active school is linked to this account.</p>}
      {organizationId && tournament && teams.length === 0 && <p>No teams have been proposed yet.</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {teams.map((team) => (
          <article key={team.team_id} style={{ padding: 20, background: "var(--bg-card)", borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2>{team.name}</h2>
                <p style={{ color: "var(--text-muted)" }}>
                  Captain: {team.captain_name ?? "Unknown"} · {team.member_count}/{team.team_size} players · {team.status.replaceAll("_", " ")}
                </p>
              </div>
              {team.submitted_at && <time dateTime={team.submitted_at}>{new Date(team.submitted_at).toLocaleDateString()}</time>}
            </div>
            {team.staff_note && <p style={{ marginTop: 10 }}>Previous note: {team.staff_note}</p>}

            {team.status === "proposed" && (
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(paymentConfirmed[team.team_id])}
                    onChange={(event) => setPaymentConfirmed((current) => ({ ...current, [team.team_id]: event.target.checked }))}
                  />
                  Payment declaration received from the team
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={busy || !paymentConfirmed[team.team_id]}
                    onClick={() => void runAction(() => approveTeamApplication(team.team_id, true), "Team approved and sent to Hanbee for review.")}
                  >
                    Approve team
                  </button>
                  <input
                    aria-label={`Changes requested for ${team.name}`}
                    placeholder="Note for the captain"
                    maxLength={300}
                    value={notes[team.team_id] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [team.team_id]: event.target.value }))}
                    disabled={busy}
                  />
                  <button type="button" disabled={busy} onClick={() => void runAction(() => returnTeamForChanges(team.team_id, notes[team.team_id] ?? ""), "Team returned to its captain for changes.")}>Request changes</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {!loading && error && <button type="button" onClick={() => void load()} style={{ marginTop: 16 }}>Try again</button>}
    </main>
  );
}
