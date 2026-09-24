import { useMemo, useRef, useState } from "react";
import { useToast } from "../../lib/ToastProvider";
import { inviteStudents, type InviteOutcome, type InviteResult } from "../../lib/portalApi";
import { Badge, Card, DataTable, type BadgeTone } from "../kit";

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function parseEmails(text: string): { valid: string[]; invalid: string[]; duplicates: number } {
  const tokens = text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const t of tokens) {
    if (!EMAIL_RE.test(t)) invalid.push(t);
    else if (seen.has(t.toLowerCase())) duplicates++;
    else {
      seen.add(t.toLowerCase());
      valid.push(t.toLowerCase());
    }
  }
  return { valid, invalid, duplicates };
}

const RESULT_LABEL: Record<InviteResult, { label: string; tone: BadgeTone }> = {
  invited: { label: "Invited", tone: "good" },
  already_invited: { label: "Already invited (expiry refreshed)", tone: "info" },
  invalid_email: { label: "Not a valid email", tone: "bad" },
  duplicate_in_list: { label: "Duplicate in your list", tone: "neutral" },
  unavailable: { label: "Unavailable: already in a school or not a student account", tone: "warn" },
};

/** Step 1 of inviting: paste or upload emails and send them to the database. */
export function InviteStudentsCard({ orgId, onInvited }: { orgId: string; onInvited: (sendable: string[]) => void }) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<InviteOutcome[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseEmails(text), [text]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const content = await file.text();
      setText((prev) => (prev.trim() ? `${prev.trim()}\n${content}` : content));
    } catch {
      showToast("Could not read that file.", "error");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send() {
    if (parsed.valid.length === 0 || busy) return;
    setBusy(true);
    try {
      const out = await inviteStudents(orgId, text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean));
      if (out.length === 0) {
        showToast("The invitations could not be sent. Please try again.", "error");
        return;
      }
      setResults(out);
      const sendable = out.filter((r) => r.result === "invited" || r.result === "already_invited").map((r) => r.email);
      onInvited(sendable);
      showToast(`${sendable.length} invitation${sendable.length === 1 ? "" : "s"} ready`);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-(--color-ink)">Invite students</h2>
      <p className="mt-1 text-sm text-(--color-slate)">Paste email addresses separated by commas, spaces or new lines, or choose a CSV or text file. Students can only join with an invited address.</p>

      <label htmlFor="invite-emails" className="mt-4 block text-sm font-medium text-(--color-ink)">Student emails</label>
      <textarea
        id="invite-emails"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="student1@example.com, student2@example.com"
        className="mt-1 w-full rounded-xl border border-(--color-line) bg-(--color-paper) p-3 text-sm text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-violet)"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-(--color-line) px-4 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud) focus-within:outline-2 focus-within:outline-(--color-violet)">
          Choose CSV or text file
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <p className="text-sm text-(--color-ink-soft)" aria-live="polite" data-testid="invite-counts">
          <span className="font-semibold text-(--color-teal-deep)">{parsed.valid.length} valid</span>
          {" and "}
          <span className={`font-semibold ${parsed.invalid.length ? "text-(--color-error)" : ""}`}>{parsed.invalid.length} invalid</span>
          {parsed.duplicates > 0 && <span className="text-(--color-slate)">, {parsed.duplicates} repeated</span>}
        </p>
      </div>
      {parsed.invalid.length > 0 && <p className="mt-2 break-words text-xs text-(--color-error)">Not valid: {parsed.invalid.join(", ")}</p>}

      <button
        type="button"
        onClick={send}
        disabled={busy || parsed.valid.length === 0}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-(--color-ink) px-6 text-sm font-semibold text-(--color-paper) disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)"
      >
        {busy ? "Sending..." : `Send ${parsed.valid.length || ""} invitation${parsed.valid.length === 1 ? "" : "s"}`}
      </button>

      {results && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-(--color-ink)">Results</h3>
          <DataTable
            rows={results}
            rowKey={(r) => `${r.email}-${r.result}`}
            columns={[
              { key: "email", header: "Email", render: (r) => <span className="break-all">{r.email}</span> },
              { key: "result", header: "Outcome", render: (r) => <Badge tone={RESULT_LABEL[r.result].tone}>{RESULT_LABEL[r.result].label}</Badge> },
            ]}
          />
        </div>
      )}
    </Card>
  );
}
