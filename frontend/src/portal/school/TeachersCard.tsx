import { useState, type FormEvent } from "react";
import { useToast } from "../../lib/ToastProvider";
import { inviteSchoolStaff, type SchoolInvitation } from "../../lib/portalApi";
import { buildInviteMessage } from "../../lib/inviteMail";
import { Badge, Card, formatDate, StatusBadge } from "../kit";

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Owner only: invite a co-teacher. The database creates a personal invitation. */
export function TeachersCard({ orgId, schoolName, invitations, reload }: { orgId: string; schoolName?: string; invitations: SchoolInvitation[]; reload: () => void }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const teacherInvites = invitations.filter((i) => i.role === "school_staff" && i.state !== "revoked");

  function personalLink(token: string) {
    return `${window.location.origin}/accept-invite?token=${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(personalLink(token));
      showToast("Invitation link copied");
    } catch {
      showToast("Could not copy. Select the link and copy it yourself.", "error");
    }
  }

  function mailtoFor(email: string, token: string) {
    const message = buildInviteMessage({ schoolName: schoolName ?? "your school", joinLink: personalLink(token) });
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setMessage("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await inviteSchoolStaff(orgId, value);
    setBusy(false);
    if (result === null) {
      setMessage("This invitation could not be created. The person may already belong to a school.");
      showToast("Could not invite this teacher.", "error");
      return;
    }
    setMessage(`Invited ${value}. A personal invitation was created for them. Use Copy invitation link or Open in mail app below to send it to them. They must sign up with this email address.`);
    showToast("Teacher invited");
    setEmail("");
    reload();
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-(--color-ink)">Teachers</h2>
      <p className="mt-1 text-sm text-(--color-slate)">Invite a co-teacher to help run your school. Only the school owner can do this.</p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor="teacher-email" className="block text-sm font-medium text-(--color-ink)">Teacher email</label>
          <input
            id="teacher-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@example.com"
            className="mt-1 min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-accent)"
          />
        </div>
        <button type="submit" disabled={busy || !email.trim()} className="inline-flex min-h-11 items-center rounded-full bg-(--color-accent) px-6 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)">
          {busy ? "Inviting..." : "Invite teacher"}
        </button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-(--color-ink-soft)">{message}</p>}

      <h3 className="mt-5 text-sm font-semibold text-(--color-ink)">Teacher invitations</h3>
      {teacherInvites.length === 0 ? (
        <p className="mt-1 text-sm text-(--color-slate)">No teacher invitations yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-(--color-line)">
          {teacherInvites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="min-w-0 break-all font-medium text-(--color-ink)">{i.email}</span>
              <StatusBadge status={i.state} />
              <Badge>Sent {formatDate(i.createdAt)}</Badge>
              {i.state === "pending" && (
                <span className="ml-auto flex flex-wrap gap-2">
                  <button type="button" onClick={() => copyLink(i.token)} className="min-h-11 rounded-full border border-(--color-line) px-4 text-xs font-semibold text-(--color-ink) hover:bg-(--color-cloud)">
                    Copy invitation link
                  </button>
                  <a href={mailtoFor(i.email, i.token)} className="inline-flex min-h-11 items-center rounded-full border border-(--color-line) px-4 text-xs font-semibold text-(--color-ink) hover:bg-(--color-cloud)">
                    Open in mail app
                  </a>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-(--color-mist)">The link only works for the email address it was created for. Use Revoke in the invitations list below if you sent one by mistake.</p>
    </Card>
  );
}
