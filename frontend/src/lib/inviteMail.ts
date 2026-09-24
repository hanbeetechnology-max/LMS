/* Invite students through the sender's own mail app instead of a server-side
   email service. The message is prefilled with the school's join link and the
   students go in BCC, so the staff member only adds their own To or Cc.

   Links have a length limit, so recipients are split into batches. A mailto:
   link opens the default mail app (Outlook desktop, Apple Mail, ...). The web
   links open Outlook on the web or Gmail in a new tab. */

export const INVITE_BATCH_SIZE = 40;

export interface InviteMessage {
  subject: string;
  body: string;
}

export function buildInviteMessage(input: { schoolName: string; joinLink: string; senderName?: string }): InviteMessage {
  return {
    subject: `You are invited to join ${input.schoolName} on HanbeeLMS`,
    body: [
      "Hello,",
      "",
      `${input.schoolName} has invited you to join the HANBEE RC tournament and learning platform.`,
      "",
      "1. Open this link:",
      input.joinLink,
      "2. Create your account using THIS email address (the one this message was sent to).",
      "3. Sign in and open your dashboard.",
      "",
      "Only invited email addresses can join, so please do not forward this message.",
      "",
      input.senderName ? `Thank you,\n${input.senderName}` : "Thank you",
    ].join("\n"),
  };
}

export interface MailBatch {
  /** 1-based batch number, for labels like "Message 2 of 3". */
  index: number;
  count: number;
  emails: string[];
  mailto: string;
  outlookWeb: string;
  gmail: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function buildMailBatches(emails: string[], message: InviteMessage, batchSize = INVITE_BATCH_SIZE): MailBatch[] {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  return chunk(unique, batchSize).map((group, i) => {
    const bcc = group.join(",");
    const subject = encodeURIComponent(message.subject);
    const body = encodeURIComponent(message.body);
    return {
      index: i + 1,
      count: group.length,
      emails: group,
      mailto: `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${subject}&body=${body}`,
      outlookWeb: `https://outlook.office.com/mail/deeplink/compose?bcc=${encodeURIComponent(bcc)}&subject=${subject}&body=${body}`,
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bcc)}&su=${subject}&body=${body}`,
    };
  });
}

/** Plain text for the Copy button: all emails, one per line. */
export function emailsAsText(emails: string[]): string {
  return [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))].join("\n");
}
