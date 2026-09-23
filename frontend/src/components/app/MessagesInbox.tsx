import { type FormEvent, useState } from "react";
import { Reveal } from "../ui/Reveal";
import type { Conversation } from "../../lib/mockMessages";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function MessagesInbox({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0].id);
  const [draft, setDraft] = useState("");
  const [composingNew, setComposingNew] = useState(false);
  const [recipient, setRecipient] = useState("");
  // Mobile-only: which panel is showing. Desktop always shows both via sm: overrides.
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const active = conversations.find((c) => c.id === activeId)!;

  function selectConversation(id: string) {
    setActiveId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
    setMobileView("thread");
  }

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              preview: draft.trim(),
              messages: [...c.messages, { id: crypto.randomUUID(), from: "me", text: draft.trim(), time: "Just now" }],
            }
          : c,
      ),
    );
    setDraft("");
  }

  function startConversation(e: FormEvent) {
    e.preventDefault();
    const name = recipient.trim();
    if (!name) return;
    const existing = conversations.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      selectConversation(existing.id);
    } else {
      const newConversation: Conversation = { id: crypto.randomUUID(), name, preview: "", unread: false, messages: [] };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveId(newConversation.id);
      setMobileView("thread");
    }
    setRecipient("");
    setComposingNew(false);
  }

  return (
    <>
      <Reveal className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Messages</h2>
        <button
          type="button"
          onClick={() => setComposingNew((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
        >
          + New message
        </button>
      </Reveal>

      {composingNew && (
        <form
          onSubmit={startConversation}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-(--color-line) p-3"
        >
          <input
            autoFocus
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient name…"
            className="flex-1 rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-2 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
          />
          <button
            type="submit"
            disabled={!recipient.trim()}
            className="rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
          >
            Start
          </button>
        </form>
      )}

      <div className="mt-6 grid h-[calc(100vh-13rem)] grid-cols-1 overflow-hidden rounded-2xl border border-(--color-line) sm:grid-cols-[280px_1fr]">
        <div
          className={`${
            mobileView === "list" ? "flex" : "hidden"
          } flex-col divide-y divide-(--color-line) overflow-y-auto border-r border-(--color-line) sm:flex`}
        >
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectConversation(c.id)}
              className={`flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 ${
                c.id === activeId ? "bg-(--color-cloud)" : "hover:bg-(--color-cloud)"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink) font-mono text-xs font-semibold text-(--color-paper)">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--color-ink)">{c.name}</p>
                <p className="truncate text-xs text-(--color-mist)">{c.preview || "No messages yet"}</p>
              </div>
              {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-(--color-violet)" />}
            </button>
          ))}
        </div>

        <div className={`${mobileView === "thread" ? "flex" : "hidden"} flex-col sm:flex`}>
          <div className="flex items-center gap-3 border-b border-(--color-line) px-5 py-3.5">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              aria-label="Back to conversations"
              className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-lg text-(--color-ink-soft) hover:bg-(--color-cloud) sm:hidden"
            >
              <BackIcon />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-ink) font-mono text-xs font-semibold text-(--color-paper)">
              {initials(active.name)}
            </span>
            <p className="text-sm font-medium text-(--color-ink)">{active.name}</p>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
            {active.messages.length === 0 && (
              <p className="pt-8 text-center text-sm text-(--color-mist)">
                No messages yet. Say hello to {active.name}!
              </p>
            )}
            {active.messages.map((m) => (
              <div key={m.id} className={`flex max-w-[75%] flex-col gap-1 ${m.from === "me" ? "ml-auto items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.from === "me"
                      ? "rounded-br-sm bg-(--color-ink) text-(--color-paper)"
                      : "rounded-bl-sm bg-(--color-cloud) text-(--color-ink-soft)"
                  }`}
                >
                  {m.text}
                </div>
                <span className="px-1 text-[11px] text-(--color-mist)">{m.time}</span>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-(--color-line) p-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${active.name}…`}
              className="flex-1 rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
