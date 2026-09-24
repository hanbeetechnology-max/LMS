import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence } from "framer-motion";
import {
  fetchMessages,
  joinPresence,
  listMembers,
  markRead,
  subscribeToConversation,
  type ChatMember,
  type ChatMessage,
  type ConversationSummary,
  type PresenceHandle,
} from "../../lib/chatApi";
import { useToast } from "../../lib/ToastProvider";
import { Avatar, formatTime } from "../kit";
import { fetchReadState, sendMessageDetailed, subscribeToReadState } from "./chatExtras";
import { GroupInfo } from "./GroupInfo";
import { GroupIcon, Tick, convName, dayLabel, nameColor, sameDay } from "./util";

const PAGE = 60;
const MAX_LEN = 4000;

interface Pending {
  key: string;
  body: string;
  status: "sending" | "failed";
  createdAt: string;
}

interface Props {
  conv: ConversationSummary;
  meId: string;
  meName: string;
  polling: boolean;
  onBack: () => void;
  onInboxChange: () => void;
}

function merge(prev: ChatMessage[], add: ChatMessage[]): ChatMessage[] {
  const ids = new Set(prev.map((m) => m.id));
  const fresh = add.filter((m) => !ids.has(m.id));
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

type Item =
  | { t: "day"; key: string; label: string }
  | { t: "unread"; key: string; count: number }
  | { t: "system"; key: string; body: string }
  | { t: "msg"; key: string; id: string; senderId: string; body: string; createdAt: string; first: boolean; pending?: Pending };

export function Thread({ conv, meId, meName, polling, onBack, onInboxChange }: Props) {
  const { showToast } = useToast();
  const isGroup = conv.kind !== "direct";
  const initialUnread = useRef(conv.unreadCount);

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [text, setText] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const scrollMode = useRef<"initial" | "bottom" | "preserve" | null>("initial");
  const prevHeight = useRef(0);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presence = useRef<PresenceHandle | null>(null);
  const lastTyping = useRef(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const msgsRef = useRef<ChatMessage[]>([]);
  msgsRef.current = msgs;

  const scheduleRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      void markRead(conv.id).then((ok) => ok && onInboxChange());
    }, 600);
  }, [conv.id, onInboxChange]);

  // Initial load
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    scrollMode.current = "initial";
    fetchMessages(conv.id, { limit: PAGE })
      .then((list) => {
        if (!live) return;
        setMsgs(list);
        setHasMore(list.length >= PAGE);
        const unread = initialUnread.current;
        if (unread > 0) {
          const foreign = list.filter((m) => m.senderId !== meId && m.kind === "text");
          if (foreign.length > 0) setFirstUnreadId(foreign[Math.max(0, foreign.length - unread)].id);
        }
        setLoading(false);
        scheduleRead();
      })
      .catch(() => {
        if (!live) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id, reloadTick]);

  const refreshMembers = useCallback(() => {
    void listMembers(conv.id).then(setMembers);
  }, [conv.id]);
  const refreshReads = useCallback(() => {
    void fetchReadState(conv.id).then(setReads);
  }, [conv.id]);

  useEffect(() => {
    refreshMembers();
    refreshReads();
    return subscribeToReadState(conv.id, refreshReads);
  }, [conv.id, refreshMembers, refreshReads]);

  // Realtime: incoming messages
  useEffect(() => {
    return subscribeToConversation(conv.id, (m) => {
      if (msgsRef.current.some((x) => x.id === m.id)) return;
      if (m.senderId === meId) {
        setPending((p) => {
          const i = p.findIndex((x) => x.status === "sending" && x.body === m.body);
          return i < 0 ? p : p.filter((_, j) => j !== i);
        });
        scrollMode.current = "bottom";
      } else if (atBottomRef.current) {
        scrollMode.current = "bottom";
      } else {
        setNewBelow((n) => n + 1);
      }
      setMsgs((prev) => merge(prev, [m]));
      if (m.kind === "system") refreshMembers();
      if (m.senderId !== meId) scheduleRead();
    });
  }, [conv.id, meId, scheduleRead, refreshMembers]);

  // Polling fallback when Realtime is down
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => {
      void fetchMessages(conv.id, { limit: 30 }).then((list) => {
        const known = new Set(msgsRef.current.map((m) => m.id));
        const fresh = list.filter((m) => !known.has(m.id));
        if (fresh.length === 0) return;
        if (atBottomRef.current) scrollMode.current = "bottom";
        else setNewBelow((n) => n + fresh.filter((m) => m.senderId !== meId).length);
        setMsgs((prev) => merge(prev, fresh));
        scheduleRead();
      });
      refreshReads();
      onInboxChange();
    }, 10000);
    return () => clearInterval(id);
  }, [polling, conv.id, meId, scheduleRead, refreshReads, onInboxChange]);

  // Presence and typing
  useEffect(() => {
    const handle = joinPresence(conv.id, { userId: meId, name: meName }, (o, t) => {
      setOnline(o.map((u) => u.userId));
      setTyping(t);
    });
    presence.current = handle;
    return () => {
      handle.leave();
      presence.current = null;
    };
  }, [conv.id, meId, meName]);

  // Mark read when the tab becomes visible again
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && scheduleRead();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (readTimer.current) clearTimeout(readTimer.current);
    };
  }, [scheduleRead]);

  // Scroll management
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    const mode = scrollMode.current;
    if (mode === "initial") {
      const divider = el.querySelector("[data-unread-divider]");
      if (divider) (divider as HTMLElement).scrollIntoView({ block: "center" });
      else el.scrollTop = el.scrollHeight;
      scrollMode.current = null;
      onScroll();
    } else if (mode === "bottom") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      scrollMode.current = null;
    } else if (mode === "preserve") {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      scrollMode.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, pending, loading, firstUnreadId]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setNewBelow(0);
    if (el.scrollTop < 60 && hasMore && !loadingOlder && !loading) void loadOlder();
  }

  async function loadOlder() {
    const oldest = msgsRef.current[0];
    if (!oldest) return;
    setLoadingOlder(true);
    const list = await fetchMessages(conv.id, { before: oldest.createdAt, limit: PAGE });
    const el = scrollRef.current;
    prevHeight.current = el ? el.scrollHeight : 0;
    // preserve position: capture the offset relative to bottom before render
    scrollMode.current = "preserve";
    if (el) prevHeight.current = el.scrollHeight - el.scrollTop; // so that new scrollTop = newHeight - prev
    setHasMore(list.length >= PAGE);
    setMsgs((prev) => merge(prev, list));
    setLoadingOlder(false);
  }

  function scrollToLatest() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setNewBelow(0);
  }

  // Sending
  async function deliver(key: string, body: string) {
    const r = await sendMessageDetailed(conv.id, body);
    if (r.ok) {
      setMsgs((prev) => merge(prev, [r.message]));
      setPending((p) => p.filter((x) => x.key !== key));
      return;
    }
    setPending((p) => p.map((x) => (x.key === key ? { ...x, status: "failed" } : x)));
    if (r.reason === "rate") showToast("You are sending messages too fast. Please wait a moment.", "error");
    else if (r.reason === "contact") {
      setBlocked(true);
      showToast("You can no longer message this person.", "error");
    } else showToast("Message not sent. Tap it to retry.", "error");
  }

  function send() {
    const body = text.trim();
    if (!body || blocked) return;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPending((p) => [...p, { key, body, status: "sending", createdAt: new Date().toISOString() }]);
    scrollMode.current = "bottom";
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
    void deliver(key, body);
  }

  function retry(p: Pending) {
    setPending((list) => list.map((x) => (x.key === p.key ? { ...x, status: "sending" } : x)));
    void deliver(p.key, p.body);
  }

  function onType(value: string) {
    setText(value);
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
    }
    const now = Date.now();
    if (value && now - lastTyping.current > 2000) {
      lastTyping.current = now;
      presence.current?.sendTyping();
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  const nameOf = useMemo(() => {
    const map = new Map(members.map((m) => [m.userId, m.fullName]));
    return (id: string) => map.get(id) ?? (id === conv.otherUserId ? conv.otherFullName : null) ?? "Someone";
  }, [members, conv.otherUserId, conv.otherFullName]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let prev: { senderId: string; date: Date; system: boolean } | null = null;
    const all: { m: ChatMessage | null; p?: Pending }[] = [...msgs.map((m) => ({ m })), ...pending.map((p) => ({ m: null, p }))];
    for (const e of all) {
      const iso = e.m ? e.m.createdAt : e.p!.createdAt;
      const date = new Date(iso);
      if (!prev || !sameDay(prev.date, date)) {
        out.push({ t: "day", key: `d-${iso}`, label: dayLabel(iso) });
        prev = null;
      }
      if (e.m && e.m.id === firstUnreadId) out.push({ t: "unread", key: "unread", count: initialUnread.current });
      if (e.m && e.m.kind === "system") {
        out.push({ t: "system", key: e.m.id, body: e.m.body });
        prev = { senderId: "", date, system: true };
        continue;
      }
      const senderId = e.m ? e.m.senderId : meId;
      const first = !prev || prev.system || prev.senderId !== senderId || (out[out.length - 1]?.t === "unread");
      out.push({ t: "msg", key: e.m ? e.m.id : `p-${e.p!.key}`, id: e.m ? e.m.id : e.p!.key, senderId, body: e.m ? e.m.body : e.p!.body, createdAt: iso, first, pending: e.p });
      prev = { senderId, date, system: false };
    }
    return out;
  }, [msgs, pending, firstUnreadId, meId]);

  function tickState(createdAt: string): "delivered" | "read" {
    const others = Object.entries(reads).filter(([id]) => id !== meId);
    if (others.length === 0) return "delivered";
    const readBy = (iso: string) => iso >= createdAt;
    if (isGroup) return others.every(([, at]) => readBy(at)) ? "read" : "delivered";
    return readBy(others[0][1]) ? "read" : "delivered";
  }

  const name = convName(conv);
  const otherOnline = !isGroup && !!conv.otherUserId && online.includes(conv.otherUserId);
  const typingNames = typing.filter((id) => id !== meId).map((id) => nameOf(id).split(" ")[0]);
  let subtitle = "";
  if (typingNames.length > 0) subtitle = typingNames.length === 1 ? `${typingNames[0]} is typing...` : `${typingNames.join(", ")} are typing...`;
  else if (isGroup) subtitle = `${members.length || conv.participantCount} members`;
  else if (otherOnline) subtitle = "online";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex h-[60px] shrink-0 items-center gap-1 bg-(--wa-header) px-2 md:px-4">
        <button type="button" onClick={onBack} aria-label="Back to chats" className="flex h-11 w-11 items-center justify-center rounded-full text-(--color-ink-soft) hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:outline-(--wa-green) md:hidden">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => isGroup && setInfoOpen(true)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-left focus-visible:outline-2 focus-visible:outline-(--wa-green)"
          aria-label={isGroup ? `${name}, group info` : name}
        >
          <Avatar name={name} size={40} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 truncate font-display text-[15px] font-semibold text-(--color-ink)">
              {isGroup && <GroupIcon className="shrink-0 text-(--color-slate)" />}
              <span className="truncate">{name}</span>
            </span>
            <span className="block h-4 truncate text-xs text-(--wa-green-text)" aria-live="polite">
              {subtitle}
            </span>
          </span>
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-haspopup="menu" aria-expanded={menuOpen} className="flex h-11 w-11 items-center justify-center rounded-full text-(--color-ink-soft) hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:outline-(--wa-green)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.800" />
              <circle cx="12" cy="12" r="1.800" />
              <circle cx="12" cy="19" r="1.800" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-xl border border-(--color-line) bg-(--color-paper) py-1 shadow-xl">
                {isGroup && (
                  <button role="menuitem" type="button" className="flex min-h-11 w-full items-center px-4 text-left text-sm text-(--color-ink) hover:bg-(--color-cloud)" onClick={() => { setMenuOpen(false); setInfoOpen(true); }}>
                    Group info
                  </button>
                )}
                <button role="menuitem" type="button" className="flex min-h-11 w-full items-center px-4 text-left text-sm text-(--color-ink) hover:bg-(--color-cloud)" onClick={() => { setMenuOpen(false); onBack(); }}>
                  Close chat
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 wa-wallpaper">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-3 py-3 md:px-[7%]" aria-label="Messages" role="log" aria-live="polite">
          {loading ? (
            <div className="space-y-3" aria-label="Loading messages">
              {[60, 40, 70, 30].map((w, i) => (
                <div key={i} className={`flex ${i % 2 ? "justify-end" : ""}`}>
                  <span className="h-10 animate-pulse rounded-xl bg-(--wa-in)/70" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="mx-auto mt-10 max-w-sm rounded-2xl border border-(--color-error)/30 bg-(--color-paper) px-5 py-4 text-sm text-(--color-error)">
              Messages could not be loaded.
              <button type="button" onClick={() => setReloadTick((t) => t + 1)} className="ml-3 min-h-11 font-semibold underline">
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="mx-auto mt-10 w-fit rounded-lg bg-(--color-paper)/90 px-4 py-2 text-center text-sm text-(--color-slate)">No messages yet. Say hello.</p>
          ) : (
            items.map((it) => {
              if (it.t === "day")
                return (
                  <div key={it.key} className="my-3 flex justify-center">
                    <span className="rounded-lg bg-(--wa-chip) px-3 py-1 text-xs font-medium text-(--color-ink-soft) shadow-sm">{it.label}</span>
                  </div>
                );
              if (it.t === "unread")
                return (
                  <div key={it.key} data-unread-divider className="my-3 flex justify-center">
                    <span className="rounded-lg bg-(--wa-chip) px-3 py-1 text-xs font-semibold text-(--wa-green-text) shadow-sm">
                      {it.count} unread message{it.count === 1 ? "" : "s"}
                    </span>
                  </div>
                );
              if (it.t === "system")
                return (
                  <div key={it.key} className="my-2 flex justify-center">
                    <span className="max-w-[85%] rounded-lg bg-(--wa-chip) px-3 py-1 text-center text-xs text-(--color-slate) shadow-sm">{it.body}</span>
                  </div>
                );
              const mine = it.senderId === meId;
              const failed = it.pending?.status === "failed";
              const tick = it.pending ? (failed ? "failed" : "sending") : tickState(it.createdAt);
              return (
                <div key={it.key} className={`flex ${mine ? "justify-end" : "justify-start"} ${it.first ? "mt-2" : "mt-0.5"}`}>
                  <div className="flex max-w-[85%] flex-col items-end md:max-w-[65%]">
                    <div
                      className={`relative rounded-lg px-2.5 pb-1.5 pt-1.5 text-[14.5px] leading-snug text-(--color-ink) shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
                        mine ? "bg-(--wa-out)" : "bg-(--wa-in)"
                      } ${it.first ? (mine ? "wa-tail-out rounded-tr-none" : "wa-tail-in rounded-tl-none") : ""} ${failed ? "opacity-80" : ""}`}
                    >
                      {isGroup && !mine && it.first && (
                        <p className="mb-0.5 text-[13px] font-semibold" style={{ color: nameColor(it.senderId) }}>
                          {nameOf(it.senderId)}
                        </p>
                      )}
                      <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{it.body}</span>
                      <span className={`inline-block ${mine ? "w-[72px]" : "w-[46px]"}`} aria-hidden="true" />
                      <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] text-(--color-slate)">
                        {formatTime(it.createdAt)}
                        {mine && (failed ? <span className="font-bold text-(--color-error)" aria-label="Not sent">!</span> : <Tick state={tick as "sending" | "delivered" | "read"} />)}
                      </span>
                    </div>
                    {it.pending && failed && (
                      <button type="button" onClick={() => retry(it.pending!)} className="mt-1 flex min-h-11 items-center gap-1.5 text-xs font-semibold text-(--color-error)">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-(--color-error) text-[10px] text-white">!</span>
                        Tap to retry
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {loadingOlder && <p className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-(--wa-chip) px-3 py-1 text-xs text-(--color-slate) shadow">Loading older messages...</p>}
        {!atBottom && !loading && (
          <button type="button" onClick={scrollToLatest} aria-label={newBelow > 0 ? `Scroll to latest, ${newBelow} new` : "Scroll to latest"} className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-(--color-paper) text-(--color-ink-soft) shadow-lg focus-visible:outline-2 focus-visible:outline-(--wa-green)">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
            {newBelow > 0 && <span className="absolute -top-2 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--wa-green) px-1 text-xs font-bold text-white">{newBelow}</span>}
          </button>
        )}
      </div>

      <div className="shrink-0 bg-(--wa-header) px-2 py-2 md:px-4">
        {blocked ? (
          <p className="flex min-h-11 items-center justify-center text-sm text-(--color-slate)">You can no longer message this person.</p>
        ) : (
          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="chat-composer" className="sr-only">
                Type a message
              </label>
              <textarea
                id="chat-composer"
                ref={taRef}
                rows={1}
                value={text}
                maxLength={MAX_LEN}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={onKey}
                placeholder="Type a message"
                className="block max-h-36 min-h-11 w-full resize-none rounded-3xl bg-(--wa-in) px-4 py-2.5 text-[15px] leading-6 text-(--color-ink) placeholder:text-(--color-slate) focus-visible:outline-2 focus-visible:outline-(--wa-green)"
              />
              {text.length >= MAX_LEN - 500 && (
                <span className="pointer-events-none absolute -top-5 right-2 text-xs text-(--color-slate)">
                  {text.length}/{MAX_LEN}
                </span>
              )}
            </div>
            <button type="button" onClick={send} disabled={!text.trim()} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--wa-green) text-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--wa-green) disabled:opacity-40">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M3 20.500V3.500L21.500 12 3 20.500zM5 17l9.500-5L5 7v3.500l6 1.500-6 1.500V17z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {infoOpen && isGroup && <GroupInfo key="info" conv={conv} members={members} meId={meId} onChanged={() => { refreshMembers(); onInboxChange(); }} onClose={() => setInfoOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
