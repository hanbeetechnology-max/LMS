"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { getAccountProfile } from "../../../lib/supabaseAuth";
import { listTournamentResults, listTournaments, listVerifiedTournamentTeams, removeTournamentResult, saveTournamentResult, type TournamentRecord, type TournamentResult, type VerifiedTournamentTeam } from "../../../lib/tournamentAdminApi";

export default function TournamentResults() {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [teams, setTeams] = useState<VerifiedTournamentTeam[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [rank, setRank] = useState("1");
  const [points, setPoints] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "staff" && profile.role !== "manager") throw new Error("Only Hanbee staff and managers can manage results.");
    const [events, verifiedTeams, savedResults] = await Promise.all([listTournaments(), listVerifiedTournamentTeams(), listTournamentResults()]);
    setTournaments(events);
    setTeams(verifiedTeams);
    setResults(savedResults);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tournament results."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const tournamentById = useMemo(() => new Map(tournaments.map((item) => [item.id, item])), [tournaments]);
  const teamById = useMemo(() => new Map(teams.map((item) => [item.id, item])), [teams]);

  function edit(result: TournamentResult) {
    setSelectedTeamId(result.team_id);
    setRank(String(result.rank));
    setPoints(String(result.points));
    setNotes(result.notes);
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = teamById.get(selectedTeamId);
    const rankValue = Number(rank);
    const pointsValue = Number(points);
    if (!team || !Number.isInteger(rankValue) || rankValue < 1 || !Number.isFinite(pointsValue) || pointsValue < 0) {
      setError("Choose a verified team and enter a positive rank and non-negative points.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await saveTournamentResult({ tournamentId: team.tournament_id, teamId: team.id, rank: rankValue, points: pointsValue, notes: notes.trim() });
      setNotice(`Result saved for ${team.name}.`);
      setSelectedTeamId(""); setRank("1"); setPoints("0"); setNotes("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't save the result."); }
    finally { setBusy(false); }
  }

  async function remove(result: TournamentResult) {
    const team = teamById.get(result.team_id);
    if (!team || !window.confirm(`Delete the result for ${team.name}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await removeTournamentResult({ tournamentId: result.tournament_id, teamId: result.team_id });
      setNotice(`Result removed for ${team.name}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't remove the result."); }
    finally { setBusy(false); }
  }

  return <section style={{ marginTop: 28 }}>
    <div className={styles.pageHeader}><h2 className={styles.pageTitle}>Tournament results</h2><p className={styles.pageSubtitle}>Publish rankings for verified teams; students see them on the leaderboard.</p></div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form className={styles.sectionCard} onSubmit={submit} style={{ marginBottom: 20 }}>
      <h3>Set team result</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 14 }}>
        <label>Verified team<select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} required><option value="">Choose team</option>{teams.map((team) => <option key={team.id} value={team.id}>{tournamentById.get(team.tournament_id)?.title ?? "Tournament"} · {team.name}</option>)}</select></label>
        <label>Rank<input type="number" min="1" step="1" value={rank} onChange={(event) => setRank(event.target.value)} required /></label>
        <label>Points<input type="number" min="0" step="any" value={points} onChange={(event) => setPoints(event.target.value)} required /></label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></label>
      <button type="submit" disabled={busy || teams.length === 0} style={{ marginTop: 14 }}>{busy ? "Saving…" : "Save result"}</button>
      {teams.length === 0 && <p style={{ marginTop: 8 }}>No verified teams are available for results.</p>}
    </form>
    {loading ? <p role="status">Loading results…</p> : <div className={styles.sectionCard}>
      <h3>Published rankings</h3>
      <div className={styles.tableContainer} style={{ marginTop: 12 }}><table className={styles.dataTable}><thead><tr><th>Tournament</th><th>Team</th><th>Rank</th><th>Points</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
        {results.map((result) => <tr key={result.id}><td>{tournamentById.get(result.tournament_id)?.title ?? "Tournament"}</td><td>{teamById.get(result.team_id)?.name ?? "Team"}</td><td>{result.rank}</td><td>{result.points}</td><td>{result.notes}</td><td><button type="button" disabled={busy} onClick={() => edit(result)}>Edit</button> <button type="button" disabled={busy} onClick={() => void remove(result)}>Delete</button></td></tr>)}
        {results.length === 0 && <tr><td colSpan={6}>No results have been published.</td></tr>}
      </tbody></table></div>
    </div>}
  </section>;
}
