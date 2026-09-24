import { useEffect, useMemo, useState } from "react";
import { listContacts, type ChatContact, type ContactRelation } from "../../lib/chatApi";
import { Avatar, EmptyState, LoadingBlock } from "../kit";

export const RELATION_LABEL: Record<ContactRelation, string> = {
  school_owner: "School owner",
  school_staff: "School staff",
  instructor: "Instructors",
  student: "Students",
  colleague: "Colleagues",
  hanbee_staff: "Hanbee staff",
  manager: "Managers",
};

const ORDER: ContactRelation[] = ["school_owner", "school_staff", "instructor", "hanbee_staff", "manager", "colleague", "student"];

interface Props {
  title?: string;
  /** Contacts already chosen or to hide (e.g. current group members). */
  excludeIds?: string[];
  busy?: boolean;
  onPick: (contact: ChatContact) => void;
  onClose: () => void;
}

/** Contact picker used by "New chat" and by "Add member". */
export function ContactPicker({ title = "New chat", excludeIds = [], busy, onPick, onClose }: Props) {
  const [contacts, setContacts] = useState<ChatContact[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError(false);
    listContacts()
      .then((c) => live && setContacts(c))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [tick]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = (contacts ?? []).filter((c) => !excludeIds.includes(c.userId) && (!q || c.fullName.toLowerCase().includes(q)));
    return ORDER.map((rel) => ({ rel, items: visible.filter((c) => c.relation === rel) })).filter((g) => g.items.length > 0);
  }, [contacts, query, excludeIds]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-(--color-paper)">
      <div className="flex h-[60px] shrink-0 items-center gap-2 bg-(--wa-header) px-2">
        <button type="button" onClick={onClose} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full text-(--color-ink-soft) hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:outline-(--wa-green)">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-display text-base font-semibold text-(--color-ink)">{title}</h2>
      </div>
      <div className="shrink-0 border-b border-(--color-line) px-3 py-2">
        <label className="sr-only" htmlFor="contact-search">
          Search people
        </label>
        <input
          id="contact-search"
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name"
          className="h-11 w-full rounded-lg bg-(--color-cloud) px-4 text-sm text-(--color-ink) placeholder:text-(--color-slate) focus-visible:outline-2 focus-visible:outline-(--wa-green)"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div role="alert" className="m-4 rounded-2xl border border-(--color-error)/30 bg-(--color-error-soft) px-5 py-4 text-sm text-(--color-error)">
            People could not be loaded.
            <button type="button" onClick={() => setTick((t) => t + 1)} className="ml-3 min-h-11 font-semibold underline">
              Try again
            </button>
          </div>
        ) : contacts === null ? (
          <LoadingBlock label="Loading people..." />
        ) : groups.length === 0 ? (
          <div className="p-4">
            <EmptyState title={query ? "No one found" : "No one to message"} body={query ? "Try a different name." : "You do not have anyone you can chat with yet."} />
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.rel} aria-label={RELATION_LABEL[g.rel]}>
              <h3 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-(--wa-green-text)">{RELATION_LABEL[g.rel]}</h3>
              <ul role="list">
                {g.items.map((c) => (
                  <li key={c.userId}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onPick(c)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--wa-green) disabled:opacity-60"
                    >
                      <Avatar name={c.fullName} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium text-(--color-ink)">{c.fullName}</span>
                        {c.orgName && <span className="block truncate text-xs text-(--color-slate)">{c.orgName}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
