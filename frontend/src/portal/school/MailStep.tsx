import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { useToast } from "../../lib/ToastProvider";
import { buildInviteMessage, buildMailBatches, emailsAsText } from "../../lib/inviteMail";
import { fetchSchoolJoinLink } from "../../lib/portalApi";
import { Card, ErrorBlock, LoadingBlock, useAsync } from "../kit";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-line) bg-(--color-paper) px-4 text-sm font-semibold text-(--color-ink) transition-colors hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";

/** Step 2 of inviting: the sender's own mail app sends the message. */
export function MailStep({ orgId, schoolName, emails }: { orgId: string; schoolName: string; emails: string[] }) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const link = useAsync(() => fetchSchoolJoinLink(orgId), [orgId]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => setCopiedKey(null), [emails]);

  const joinLink = link.data ?? "";
  const message = useMemo(() => buildInviteMessage({ schoolName, joinLink, senderName: profile?.fullName }), [schoolName, joinLink, profile?.fullName]);
  const batches = useMemo(() => buildMailBatches(emails, message), [emails, message]);

  async function copy(key: string, text: string, okMessage: string) {
    const ok = await copyText(text);
    if (ok) {
      setCopiedKey(key);
      showToast(okMessage);
    } else showToast("Could not copy. Select the text and copy it by hand.", "error");
  }

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold text-(--color-ink)">Send the invitations from your own email</h3>
      <p className="mt-1 text-sm text-(--color-slate)">
        The students are added as BCC, so they cannot see each other. You only add your own address in To or Cc.
      </p>

      {link.loading ? (
        <LoadingBlock />
      ) : link.error || !link.data ? (
        <div className="mt-3">
          <ErrorBlock onRetry={link.reload} />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-(--color-line) bg-(--color-cloud) p-4 text-sm" aria-label="Message preview">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-(--color-mist)">Subject</p>
            <p className="font-medium text-(--color-ink)">{message.subject}</p>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.1em] text-(--color-mist)">Message</p>
            <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-(--color-ink-soft)">{message.body}</pre>
          </div>

          {batches.length === 0 ? (
            <p className="mt-4 text-sm text-(--color-slate)">There are no invited emails to send to.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {batches.map((b) => (
                <li key={b.index} className="flex flex-wrap items-center gap-2 rounded-xl border border-(--color-line) p-3" data-testid="mail-batch">
                  <span className="mr-auto text-sm font-medium text-(--color-ink)">
                    Message {b.index} of {batches.length}, {b.count} {b.count === 1 ? "student" : "students"}
                  </span>
                  <a href={b.mailto} className={btn}>Open in mail app</a>
                  <a href={b.outlookWeb} target="_blank" rel="noopener noreferrer" className={btn}>Outlook on the web</a>
                  <a href={b.gmail} target="_blank" rel="noopener noreferrer" className={btn}>Gmail</a>
                  <button type="button" onClick={() => copy(`e${b.index}`, emailsAsText(b.emails), "Emails copied")} className={btn}>
                    {copiedKey === `e${b.index}` ? "Copied" : "Copy emails"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => copy("link", joinLink, "Invitation link copied")} className={btn}>
              {copiedKey === "link" ? "Copied" : "Copy invitation link"}
            </button>
            <span className="min-w-0 break-all text-xs text-(--color-mist)">{joinLink}</span>
          </div>
        </>
      )}
    </Card>
  );
}
