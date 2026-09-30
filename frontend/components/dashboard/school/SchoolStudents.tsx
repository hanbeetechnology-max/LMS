"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { Input, Textarea } from "../../ui/FormField";
import Shimmer from "../../ui/Shimmer";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";
import { fetchMyOrganizationId } from "../../../lib/teamFormationApi";
import { fetchSchoolStudents, type SchoolStudentRow } from "../../../lib/schoolAdminApi";

type Invitation = { id: string; email: string; token: string; expires_at: string; accepted: boolean; revoked_at: string | null };
type InviteResult = { email: string; result: string };

async function rpc<T>(name: string, args: Record<string, unknown>) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export default function SchoolStudents() {
  const [studentSearch, setStudentSearch] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [emails, setEmails] = useState("");
  const [mailRecipients, setMailRecipients] = useState<string[]>([]);
  const [mailStatus, setMailStatus] = useState("");
  const queryClient = useQueryClient();

  const { data: orgId } = useQuery({ queryKey: ["my-org-id"], queryFn: fetchMyOrganizationId });

  const { data: joinToken } = useQuery({
    queryKey: ["school-join-token", orgId],
    queryFn: async () => {
      const params = new URLSearchParams({ select: "join_token", id: `eq.${orgId}`, limit: "1" });
      const orgs = await authenticatedSupabaseFetch<Array<{ join_token: string }>>(`/rest/v1/organizations?${params}`);
      return orgs[0]?.join_token ?? "";
    },
    enabled: Boolean(orgId),
  });

  const { data: students, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ["school-students", orgId],
    queryFn: () => fetchSchoolStudents(orgId as string),
    enabled: Boolean(orgId),
  });

  const { data: invitations, isLoading: invitesLoading } = useQuery({
    queryKey: ["school-invitations", orgId],
    queryFn: () => authenticatedSupabaseFetch<Invitation[]>(`/rest/v1/invitations?select=id,email,token,expires_at,accepted,revoked_at&org_id=eq.${orgId}&role=eq.student&order=created_at.desc`),
    enabled: Boolean(orgId),
  });

  const invalidateRoster = () => {
    queryClient.invalidateQueries({ queryKey: ["school-students", orgId] });
    queryClient.invalidateQueries({ queryKey: ["school-invitations", orgId] });
  };

  const invite = useMutation({
    mutationFn: (list: string[]) => rpc<InviteResult[]>("invite_students", { p_org: orgId, p_emails: list }),
    onSuccess: (result) => {
      setMailRecipients(result.filter((row) => ["invited", "already_invited"].includes(row.result)).map((row) => row.email));
      setMailStatus("");
      setEmails("");
      invalidateRoster();
    },
  });

  const revoke = useMutation({
    mutationFn: (invitation: Invitation) => rpc("revoke_invitation", { p_invitation: invitation.id }),
    onSuccess: invalidateRoster,
  });

  const rotateLink = useMutation({
    mutationFn: () => rpc<string>("rotate_school_join_link", { p_org: orgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school-join-token", orgId] }),
  });

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    const list = [...new Set(emails.split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean))];
    if (!list.length) return;
    if (list.length > 200) return;
    invite.mutate(list);
  }

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students ?? [];
    return (students ?? []).filter((s) => s.full_name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query));
  }, [students, studentSearch]);

  const filteredInvitations = useMemo(() => {
    const query = inviteSearch.trim().toLowerCase();
    if (!query) return invitations ?? [];
    return (invitations ?? []).filter((i) => i.email.toLowerCase().includes(query));
  }, [invitations, inviteSearch]);

  const inviteUrl = (invitation: Invitation) => `${typeof window !== "undefined" ? window.location.origin : ""}/signup?invite_token=${encodeURIComponent(invitation.token)}&email=${encodeURIComponent(invitation.email)}`;
  const schoolSignupUrl = typeof window !== "undefined" && joinToken ? `${window.location.origin}/signup?join_token=${encodeURIComponent(joinToken)}` : "";
  const schoolJoinUrl = typeof window !== "undefined" && joinToken ? `${window.location.origin}/dashboard/join-school?join_token=${encodeURIComponent(joinToken)}` : "";
  const mailBatches = Array.from({ length: Math.ceil(mailRecipients.length / 40) }, (_, index) => mailRecipients.slice(index * 40, (index + 1) * 40));
  const makeEmailDraft = (recipients: string[]) => ({
    bcc: recipients.join(","),
    subject: "Invitation to join our school on Hanbee",
    body: `Hello,\n\nYou have been invited to join our school on Hanbee.\n\nNew to Hanbee? Create your student account with the invited email address:\n${schoolSignupUrl}\n\nAlready have a Hanbee account? Sign in, then open this school join page:\n${schoolJoinUrl}\n\nRegards,\n`,
  });
  function emailAppUrl(app: "mailto" | "outlook" | "gmail", recipients: string[]) {
    const draft = makeEmailDraft(recipients);
    if (app === "mailto") return `mailto:?${new URLSearchParams({ bcc: draft.bcc, subject: draft.subject, body: draft.body })}`;
    if (app === "outlook") return `https://outlook.office.com/mail/deeplink/compose?${new URLSearchParams({ to: "", bcc: draft.bcc, subject: draft.subject, body: draft.body })}`;
    return `https://mail.google.com/mail/?view=cm&fs=1&${new URLSearchParams({ to: "", bcc: draft.bcc, su: draft.subject, body: draft.body })}`;
  }
  async function copyInvitationMessage() {
    const draft = makeEmailDraft(mailRecipients);
    try {
      await navigator.clipboard.writeText(`To: (add your own address)\nBcc: ${draft.bcc}\nSubject: ${draft.subject}\n\n${draft.body}`);
      setMailStatus("Invitation message copied.");
    } catch {
      setMailStatus("Clipboard access is unavailable; open a draft instead.");
    }
  }

  const busy = invite.isPending || revoke.isPending || rotateLink.isPending;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Students</h1>
        <p className={styles.pageSubtitle}>School roster, course progress, and secure student invitations</p>
      </div>
      {(studentsError || invite.isError || revoke.isError || rotateLink.isError) && (
        <p role="alert">{[studentsError, invite.error, revoke.error, rotateLink.error].find(Boolean) instanceof Error
          ? ([studentsError, invite.error, revoke.error, rotateLink.error].find(Boolean) as Error).message
          : "Something went wrong."}</p>
      )}
      {invite.isSuccess && <p role="status">{invite.data.map((row) => `${row.email}: ${row.result.replaceAll("_", " ")}`).join(" · ")}</p>}
      {rotateLink.isSuccess && <p role="status">School join link replaced. The previous link no longer works.</p>}
      <form className={styles.sectionCard} onSubmit={handleInvite} style={{ marginBottom: 24 }}>
        <h2 className={styles.sectionTitle}>Invite students</h2>
        <p style={{ marginTop: 8, color: "var(--text-muted)" }}>Enter one or more email addresses separated by commas, spaces, or new lines. Students with an existing Hanbee account can sign in and join using the school link below.</p>
        <Textarea value={emails} onChange={(event) => setEmails(event.target.value)} rows={3} maxLength={20000} style={{ width: "100%", marginTop: 12 }} placeholder="student@example.com" />
        <button className={styles.actionBtn} type="submit" disabled={busy || studentsLoading} style={{ marginTop: 12 }}>{invite.isPending ? "Sending…" : "Send invitations"}</button>
        {mailBatches.length > 0 && schoolSignupUrl && <div style={{ marginTop: 18, padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
          <h3 style={{ fontSize: 15 }}>Email invitations</h3>
          <p style={{ margin: "7px 0 12px", color: "var(--text-muted)" }}>Open a draft for each group of up to 40 students, add your own address to To or Cc, then send it from your mail app.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{mailBatches.map((batch, index) => <span key={index} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span>Batch {index + 1} ({batch.length})</span><a href={emailAppUrl("mailto", batch)}>Mail app</a><a href={emailAppUrl("outlook", batch)} target="_blank" rel="noreferrer">Outlook</a><a href={emailAppUrl("gmail", batch)} target="_blank" rel="noreferrer">Gmail</a></span>)}</div>
          <button type="button" className={styles.actionBtn} style={{ marginTop: 12 }} onClick={() => void copyInvitationMessage()}>Copy invitation message</button>
          {mailStatus && <p role="status" style={{ marginTop: 8 }}>{mailStatus}</p>}
        </div>}
        {joinToken && <div style={{ marginTop: 16, padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Your school's join link</h3>
          <a href={schoolSignupUrl}>Open student sign-up link</a> · <a href={schoolJoinUrl}>Existing account join page</a>
          <p style={{ marginTop: 8, overflowWrap: "anywhere", color: "var(--text-muted)" }}>{schoolJoinUrl}</p>
          <button className={styles.actionBtn} type="button" disabled={busy} onClick={() => rotateLink.mutate()}>Replace school link</button>
          <p style={{ marginTop: 6, color: "var(--text-muted)" }}>Replacing this link immediately invalidates copies of the previous link.</p>
        </div>}
      </form>
      <section className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 className={styles.sectionTitle}>Active students ({(students ?? []).length})</h2>
          <div style={{ position: "relative", maxWidth: 260, flex: "1 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students…" aria-label="Search students" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        {studentsLoading ? <Shimmer rows={3} /> : <div className={styles.tableContainer} style={{ marginTop: 14 }}>
          <table className={styles.dataTable}><thead><tr><th>Student</th><th>Team</th><th>Courses</th><th>Lessons</th><th>Progress</th><th>Last active</th></tr></thead>
            <tbody>{filteredStudents.map((student: SchoolStudentRow) => <tr key={student.student_id}><td>{student.full_name}<br /><small>{student.email}</small></td><td>{student.team_name ?? "—"}</td><td>{student.courses_enrolled}</td><td>{student.lessons_completed}/{student.lessons_total}</td><td>{student.completion_pct}%</td><td>{student.last_active ? new Date(student.last_active).toLocaleDateString() : "—"}</td></tr>)}
              {filteredStudents.length === 0 && <tr><td colSpan={6}>{studentSearch ? "No students match your search." : "No active students yet."}</td></tr>}</tbody>
          </table>
        </div>}
      </section>
      <section className={styles.sectionCard} style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 className={styles.sectionTitle}>Student invitations</h2>
          <div style={{ position: "relative", maxWidth: 260, flex: "1 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <Input value={inviteSearch} onChange={(event) => setInviteSearch(event.target.value)} placeholder="Search invitations…" aria-label="Search invitations" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        {invitesLoading ? <Shimmer rows={3} /> : <div className={styles.tableContainer} style={{ marginTop: 14 }}>
          <table className={styles.dataTable}><thead><tr><th>Email</th><th>Status</th><th>Expires</th><th>Invite link</th><th>Action</th></tr></thead>
            <tbody>{filteredInvitations.map((invitation) => <tr key={invitation.id}><td>{invitation.email}</td><td>{invitation.accepted ? "Accepted" : invitation.revoked_at ? "Revoked" : "Pending"}</td><td>{new Date(invitation.expires_at).toLocaleDateString()}</td><td>{!invitation.accepted && !invitation.revoked_at && <a href={inviteUrl(invitation)}>Open signup link</a>}</td><td>{!invitation.accepted && !invitation.revoked_at && <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => revoke.mutate(invitation)}>Revoke</button>}</td></tr>)}
              {filteredInvitations.length === 0 && <tr><td colSpan={5}>{inviteSearch ? "No invitations match your search." : "No invitations found."}</td></tr>}</tbody>
          </table>
        </div>}
      </section>
    </div>
  );
}
