"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import {
  answerTeamInvitation,
  applyStudentTeam,
  createSoloTournamentEntry,
  fetchMySoloStatus,
  fetchMyTeamFormation,
  fetchUpcomingTournament,
  inviteStudentToTeam,
  leaveStudentTeam,
  startStudentTeam,
  submitStudentTeam,
  type MyTeamFormation,
  type UpcomingTournament,
} from "../../../lib/teamFormationApi";

export default function MyTeamPage() {
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [formation, setFormation] = useState<MyTeamFormation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [isSolo, setIsSolo] = useState(false);
  const [paymentDeclared, setPaymentDeclared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [upcoming, solo] = await Promise.all([fetchUpcomingTournament(), fetchMySoloStatus()]);
      setTournament(upcoming);
      setIsSolo(solo);
      setFormation(upcoming ? await fetchMyTeamFormation(upcoming.id) : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load your team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The team update was refused.");
    } finally {
      setBusy(false);
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;
    await runAction(() => startStudentTeam(tournament.id, teamName), "Team created.");
    setTeamName("");
  }

  async function inviteClassmate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = formation?.my_team;
    if (!team || !inviteeId) return;
    await runAction(() => inviteStudentToTeam(team.id, inviteeId), "Invitation sent.");
    setInviteeId("");
  }

  if (loading) return <p role="status">Loading team information…</p>;
  if (error && !tournament) {
    return <div role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></div>;
  }

  const team = formation?.my_team;
  const playerCount = team?.members.length ?? 0;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Team</h1>
        <p className={styles.pageSubtitle}>
          {tournament ? `${tournament.title} · ${tournament.team_size} players per school team` : "Team formation opens when the next tournament is announced."}
        </p>
      </div>

      {error && <p role="alert" style={{ color: "#b42318", marginBottom: 16 }}>{error}</p>}
      {notice && <p role="status" style={{ marginBottom: 16 }}>{notice}</p>}

      {tournament && formation && (
        <div style={{ display: "grid", gap: 20, maxWidth: 800 }}>
          {formation.invitations.length > 0 && (
            <section style={{ padding: 24, background: "var(--bg-card)", borderRadius: 18 }}>
              <h2>Team invitations</h2>
              {formation.invitations.map((invitation) => (
                <div key={invitation.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 16 }}>
                  <p>{invitation.team_name} · {invitation.members} members</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" disabled={busy} onClick={() => void runAction(() => answerTeamInvitation(invitation.id, true), "You joined the team.")}>Accept</button>
                    <button type="button" disabled={busy} onClick={() => void runAction(() => answerTeamInvitation(invitation.id, false), "Invitation declined.")}>Decline</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {!team && formation.school_id && (
            <section style={{ padding: 28, background: "var(--bg-card)", borderRadius: 20 }}>
              <h2>You are not on a team yet</h2>
              <p style={{ margin: "10px 0 18px", color: "var(--text-muted)" }}>
                {formation.slots?.max_teams == null
                  ? "Your school staff haven't opened team slots yet."
                  : `${formation.slots.remaining ?? 0} of ${formation.slots.max_teams} school team slots remain.`}
              </p>
              {formation.slots?.remaining !== 0 && formation.slots?.max_teams != null && (
                <form onSubmit={createTeam} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <label htmlFor="new-team-name" className="sr-only">Team name</label>
                  <input
                    id="new-team-name"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Choose a team name"
                    minLength={1}
                    maxLength={40}
                    required
                    disabled={busy}
                  />
                  <button type="submit" disabled={busy}>{busy ? "Creating…" : "Start a team"}</button>
                </form>
              )}
            </section>
          )}

          {!team && !formation.school_id && (
            <section style={{ padding: 28, background: "var(--bg-card)", borderRadius: 20 }}>
              <h2>{isSolo ? "Solo tournament entry" : "School membership needed"}</h2>
              <p>{isSolo ? "Enter this tournament as a team of one. Your entry will be reviewed by Hanbee staff after you confirm payment." : "Your account is not attached to an active school or marked for solo entry. Contact Hanbee staff to restore your school membership or enable solo participation."}</p>
              {isSolo && <button type="button" disabled={busy} onClick={() => void runAction(() => createSoloTournamentEntry(tournament.id), "Solo entry created. Review the payment step below to submit it.")}>Create solo entry</button>}
            </section>
          )}

          {team && (
            <section style={{ padding: 28, background: "var(--bg-card)", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h2>{team.name}</h2>
                  <p style={{ color: "var(--text-muted)" }}>{team.status.replaceAll("_", " ")} · {playerCount}/{tournament.team_size} players</p>
                </div>
                {team.is_captain && <span>Captain</span>}
              </div>

              {team.staff_note && <p style={{ marginTop: 12 }}>School staff note: {team.staff_note}</p>}
              <ul style={{ margin: "18px 0", paddingLeft: 20 }}>
                {team.members.map((member) => <li key={member.student_id}>{member.name}{member.is_captain ? " · Captain" : ""}</li>)}
                {team.pending_invites.map((invite) => <li key={invite.id}>{invite.name} · Invitation pending</li>)}
              </ul>

              {team.is_captain && team.status === "draft" && (
                <>
                  {formation.school_id && formation.eligible_classmates.length > 0 && (
                    <form onSubmit={inviteClassmate} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                      <label htmlFor="team-invitee" className="sr-only">Classmate to invite</label>
                      <select id="team-invitee" value={inviteeId} onChange={(event) => setInviteeId(event.target.value)} required disabled={busy}>
                        <option value="">Choose a classmate</option>
                        {formation.eligible_classmates.map((student) => <option key={student.student_id} value={student.student_id}>{student.name}</option>)}
                      </select>
                      <button type="submit" disabled={busy}>Invite classmate</button>
                    </form>
                  )}
                  {formation.school_id ? <button type="button" disabled={busy || playerCount !== tournament.team_size} onClick={() => void runAction(() => submitStudentTeam(team.id), "Team sent to school staff for approval.")}>
                    {playerCount === tournament.team_size ? "Submit team for approval" : `Invite ${tournament.team_size - playerCount} more player${tournament.team_size - playerCount === 1 ? "" : "s"}`}
                  </button> : <div style={{ display: "grid", gap: 10 }}>
                    <p>Confirm payment for your solo tournament entry. Hanbee staff will verify the entry after submission.</p>
                    {process.env.NEXT_PUBLIC_TOURNAMENT_PAYMENT_QR_URL && <a href={process.env.NEXT_PUBLIC_TOURNAMENT_PAYMENT_QR_URL} target="_blank" rel="noreferrer">View tournament payment QR</a>}
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={paymentDeclared} onChange={(event) => setPaymentDeclared(event.target.checked)} />I have completed the tournament payment.</label>
                    <button type="button" disabled={busy || !paymentDeclared} onClick={() => void runAction(() => applyStudentTeam(team.id, true), "Payment declared. Your solo entry is waiting for Hanbee review.")}>Submit paid solo entry</button>
                  </div>}
                </>
              )}

              {team.status === "proposed" && <p style={{ marginTop: 16 }}>Your school staff are reviewing this team.</p>}
              {team.status === "draft" && !team.is_captain && <p style={{ marginTop: 16 }}>Your captain is forming the team.</p>}
              {team.status === "payment_declared" && <p style={{ marginTop: 16 }}>{formation.school_id ? "Your school approved the team." : "Your payment declaration was received."} Hanbee staff will review its entry.</p>}
              {team.status === "verified" && <p style={{ marginTop: 16 }}>Your team is verified for the tournament.</p>}
              {team.is_captain && team.status === "draft" && <button type="button" disabled={busy} onClick={() => void runAction(() => leaveStudentTeam(team.id), "You left the team.")}>Leave team</button>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
