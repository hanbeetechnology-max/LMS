import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ConversationSummary } from "../../lib/chatApi";
import { Avatar, EmptyState } from "../kit";
import { GroupIcon, convName, listTime } from "./util";

interface Props {
  meName: string;
  conversations: ConversationSummary[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

function Preview({ c, meName }: { c: ConversationSummary; meName: string }) {
  if (!c.lastAt || c.lastBody === null) return <span className="italic">No messages yet</span>;
  if (c.lastKind === "system") return <span className="italic opacity-80">{c.lastBody}</span>;
  const mine = !!c.lastSenderName && c.lastSenderName === meName;
  const prefix = mine ? "You: " : c.kind !== "direct" && c.lastSenderName ? `${c.lastSenderName.split(" ")[0]}: ` : "";
  return (
    <span>
      {prefix}
      {c.lastBody}
    </span>
  );
}

export function ConversationList({ meName, conversations, loading, error, onRetry, activeId, onSelect, onNewChat }: Props) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => convName(c).toLowerCase().includes(q) || (c.lastBody ?? "").toLowerCase().includes(q));
  }, [conversations, query]);

  function onKey(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-row]") ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    buttons[Math.min(buttons.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[60px] shrink-0 items-center gap-3 bg-(--wa-header) px-4">
        <Avatar name={meName || "Me"} size={40} />
        <p className="min-w-0 flex-1 truncate font-display text-base font-semibold text-(--color-ink)">{meName || "Chats"}</p>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
          className="flex h-11 w-11 items-center justify-center rounded-full text-(--color-ink-soft) hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:outline-(--wa-green)"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.500 3.500a2.100 2.100 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
      </div>

      <div className="shrink-0 border-b border-(--color-line) px-3 py-2">
        <label className="sr-only" htmlFor="chat-search">
          Search chats
        </label>
        <input
          id="chat-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or start a new chat"
          className="h-11 w-full rounded-lg bg-(--color-cloud) px-4 text-sm text-(--color-ink) placeholder:text-(--color-slate) focus-visible:outline-2 focus-visible:outline-(--wa-green)"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ul aria-label="Loading chats" className="divide-y divide-(--color-line)">
            {Array.from({ length: 7 }).map((_, i) => (
              <li key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
                <span className="h-12 w-12 rounded-full bg-(--color-cloud)" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/3 rounded bg-(--color-cloud)" />
                  <span className="block h-3 w-2/3 rounded bg-(--color-cloud)" />
                </span>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div role="alert" className="m-4 rounded-2xl border border-(--color-error)/30 bg-(--color-error-soft) px-5 py-4 text-sm text-(--color-error)">
            Chats could not be loaded.
            <button type="button" onClick={onRetry} className="ml-3 min-h-11 font-semibold underline">
              Try again
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No chats yet"
              body="Start a conversation with someone you can message."
              action={
                <button type="button" onClick={onNewChat} className="min-h-11 rounded-full bg-(--wa-green) px-5 text-sm font-semibold text-white">
                  New chat
                </button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-(--color-slate)">No chats match "{query}".</p>
        ) : (
          <ul ref={listRef} role="list" aria-label="Chats" onKeyDown={onKey}>
            {filtered.map((c) => {
              const name = convName(c);
              const unread = c.unreadCount > 0;
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    data-row
                    aria-current={active ? "true" : undefined}
                    onClick={() => onSelect(c.id)}
                    className={`flex min-h-[72px] w-full items-center gap-3 border-b border-(--color-line) px-4 py-2.5 text-left transition-colors hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--wa-green) ${
                      active ? "bg-(--color-cloud)" : ""
                    }`}
                  >
                    <span className="relative shrink-0">
                      <Avatar name={name} size={48} />
                      {c.kind !== "direct" && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--color-paper) text-(--color-slate)">
                          <GroupIcon />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[15px] text-(--color-ink) ${unread ? "font-bold" : "font-medium"}`}>{name}</span>
                        <span className={`shrink-0 text-xs ${unread ? "font-semibold text-(--wa-green-text)" : "text-(--color-slate)"}`}>{listTime(c.lastAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${unread ? "font-semibold text-(--color-ink)" : "text-(--color-slate)"}`}>
                          <Preview c={c} meName={meName} />
                        </span>
                        {unread && (
                          <span aria-label={`${c.unreadCount} unread`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-(--wa-green) px-1.5 text-xs font-bold text-white">
                            {c.unreadCount > 99 ? "99+" : c.unreadCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
