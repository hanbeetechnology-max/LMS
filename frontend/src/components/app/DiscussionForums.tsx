import { type FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem } from "../ui/Reveal";
import { DiscussionIcon } from "../landing/icons";
import { useToast } from "../../lib/ToastProvider";

interface Post {
  id: string;
  author: string;
  body: string;
  date: string;
  isStaff?: boolean;
}

interface Thread {
  id: string;
  title: string;
  author: string;
  lastActivity: string;
  pinned: boolean;
  locked: boolean;
  isStaff?: boolean;
  posts: Post[];
}

const INITIAL: Thread[] = [
  {
    id: "1",
    title: "Welcome — introduce yourself!",
    author: "Devon Brooks",
    lastActivity: "2 hours ago",
    pinned: true,
    locked: false,
    isStaff: true,
    posts: [
      { id: "p1", author: "Devon Brooks", body: "Kick things off by sharing your name and what you hope to get out of this course.", date: "1 week ago", isStaff: true },
      { id: "p2", author: "Ava Chen", body: "Hi all! Excited to learn more about color theory.", date: "5 days ago" },
      { id: "p3", author: "Liam Cole", body: "Looking forward to the typography module.", date: "3 days ago" },
    ],
  },
  {
    id: "2",
    title: "Question about the Week 3 reading",
    author: "Noah Reyes",
    lastActivity: "1 day ago",
    pinned: false,
    locked: false,
    posts: [
      { id: "p4", author: "Noah Reyes", body: "Is the reading for Week 3 the full chapter or just sections 1-3?", date: "1 day ago" },
    ],
  },
  {
    id: "3",
    title: "Midterm project ideas",
    author: "Liam Cole",
    lastActivity: "4 days ago",
    pinned: false,
    locked: true,
    posts: [
      { id: "p5", author: "Liam Cole", body: "Thread closed — see the pinned announcement for approved project topics.", date: "4 days ago" },
    ],
  },
];

function ThreadDetail({
  thread,
  canModerate,
  onBack,
  onUpdate,
  onDelete,
}: {
  thread: Thread;
  canModerate: boolean;
  onBack: () => void;
  onUpdate: (t: Thread) => void;
  onDelete: (id: string) => void;
}) {
  const [reply, setReply] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const { showToast } = useToast();

  function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || thread.locked) return;
    onUpdate({
      ...thread,
      lastActivity: "Just now",
      posts: [...thread.posts, { id: crypto.randomUUID(), author: "You", body: reply.trim(), date: "Just now" }],
    });
    setReply("");
  }

  function startEdit(post: Post) {
    setEditingPostId(post.id);
    setEditDraft(post.body);
  }

  function saveEdit(postId: string) {
    if (!editDraft.trim()) return;
    onUpdate({
      ...thread,
      posts: thread.posts.map((p) => (p.id === postId ? { ...p, body: editDraft.trim() } : p)),
    });
    setEditingPostId(null);
  }

  function deletePost(postId: string) {
    onUpdate({ ...thread, posts: thread.posts.filter((p) => p.id !== postId) });
    showToast("Post deleted.");
  }

  return (
    <>
      <button type="button" onClick={onBack} className="text-sm font-medium text-(--color-slate) hover:text-(--color-ink)">
        ← All threads
      </button>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">{thread.title}</h2>
        {canModerate && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ ...thread, pinned: !thread.pinned })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                thread.pinned ? "bg-(--color-amber) text-(--color-ink-fixed)" : "bg-(--color-cloud) text-(--color-slate) hover:bg-(--color-line)"
              }`}
            >
              {thread.pinned ? "Pinned" : "Pin"}
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ ...thread, locked: !thread.locked })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                thread.locked ? "bg-(--color-error) text-(--color-paper)" : "bg-(--color-cloud) text-(--color-slate) hover:bg-(--color-line)"
              }`}
            >
              {thread.locked ? "Locked" : "Lock"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(thread.id)}
              className="rounded-full bg-(--color-cloud) px-3 py-1.5 text-xs font-medium text-(--color-error) transition-colors hover:bg-(--color-error-soft)"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <StaggerGroup className="mt-6 flex flex-col gap-4">
        {thread.posts.map((post) => {
          const isOwn = post.author === "You";
          const isEditing = editingPostId === post.id;
          return (
            <StaggerItem key={post.id} y={12} className="rounded-2xl border border-(--color-line) p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-ink) font-mono text-[10px] font-semibold text-(--color-paper)">
                  {post.author.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </span>
                <p className="text-sm font-medium text-(--color-ink)">{post.author}</p>
                {post.isStaff && (
                  <span className="rounded-full bg-(--color-violet-soft) px-1.5 py-0.5 text-[10px] font-semibold uppercase text-(--color-violet)">
                    Staff
                  </span>
                )}
                <span className="text-xs text-(--color-mist)">{post.date}</span>
                {isOwn && !isEditing && (
                  <div className="ml-auto flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="text-xs font-medium text-(--color-error) hover:text-(--color-error)/80"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 focus:border-(--color-violet)"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPostId(null)}
                      className="rounded-full border border-(--color-line) px-3 py-1.5 text-xs font-medium text-(--color-ink-soft) hover:border-(--color-ink) hover:text-(--color-ink)"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(post.id)}
                      disabled={!editDraft.trim()}
                      className="rounded-full bg-(--color-ink) px-3 py-1.5 text-xs font-semibold text-(--color-paper) disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-(--color-ink-soft)">{post.body}</p>
              )}
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      {thread.locked ? (
        <p className="mt-6 rounded-xl bg-(--color-cloud) px-4 py-3 text-sm text-(--color-slate)">
          This thread is locked and no longer accepting replies.
        </p>
      ) : (
        <form onSubmit={handleReply} className="mt-6 flex items-center gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
          />
          <button
            type="submit"
            disabled={!reply.trim()}
            className="rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
          >
            Reply
          </button>
        </form>
      )}
    </>
  );
}

function NewThreadComposer({ onCancel, onCreate }: { onCancel: () => void; onCreate: (t: Thread) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="mb-6 rounded-2xl border border-(--color-line) p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thread title"
          className="w-full border-none bg-transparent text-[15px] font-medium text-(--color-ink) outline-none placeholder:text-(--color-mist)"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start the conversation…"
          rows={3}
          className="mt-3 w-full resize-none rounded-xl border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!title.trim() || !body.trim()}
            onClick={() =>
              onCreate({
                id: crypto.randomUUID(),
                title: title.trim(),
                author: "You",
                lastActivity: "Just now",
                pinned: false,
                locked: false,
                posts: [{ id: crypto.randomUUID(), author: "You", body: body.trim(), date: "Just now" }],
              })
            }
            className="rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
          >
            Start thread
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function DiscussionForums({ canModerate = false }: { canModerate?: boolean }) {
  const { showToast } = useToast();
  const [threads, setThreads] = useState(INITIAL);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const sorted = [...threads].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  function updateThread(next: Thread) {
    setThreads((prev) => prev.map((t) => (t.id === next.id ? next : t)));
  }

  function deleteThread(id: string) {
    const thread = threads.find((t) => t.id === id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
    setActiveId(null);
    showToast(`Deleted "${thread?.title}".`);
  }

  if (active) {
    return (
      <ThreadDetail
        thread={active}
        canModerate={canModerate}
        onBack={() => setActiveId(null)}
        onUpdate={updateThread}
        onDelete={deleteThread}
      />
    );
  }

  return (
    <>
      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Discussions</h2>
          <p className="mt-1 text-[15px] text-(--color-slate)">Course-wide conversations and Q&amp;A.</p>
        </div>
        {!composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            + New thread
          </button>
        )}
      </Reveal>

      <div className="mt-8">
        <AnimatePresence>
          {composing && (
            <NewThreadComposer
              onCancel={() => setComposing(false)}
              onCreate={(t) => {
                setThreads((prev) => [t, ...prev]);
                setComposing(false);
                setActiveId(t.id);
              }}
            />
          )}
        </AnimatePresence>

      <StaggerGroup className="flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
        {sorted.map((thread) => (
          <StaggerItem
            key={thread.id}
            y={12}
            className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-(--color-cloud)"
          >
            <button type="button" onClick={() => setActiveId(thread.id)} className="flex w-full items-center gap-4 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-violet-soft) text-(--color-violet)">
                <DiscussionIcon />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-(--color-ink)">{thread.title}</p>
                  {thread.pinned && (
                    <span className="rounded-full bg-(--color-amber-soft) px-2 py-0.5 text-[10px] font-semibold uppercase text-(--color-amber-deep)">
                      Pinned
                    </span>
                  )}
                  {thread.locked && (
                    <span className="rounded-full bg-(--color-cloud) px-2 py-0.5 text-[10px] font-semibold uppercase text-(--color-slate)">
                      Locked
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-(--color-mist)">
                  Started by {thread.author}
                  {thread.isStaff && " (Staff)"} · {thread.lastActivity}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs text-(--color-mist)">
                {thread.posts.length} {thread.posts.length === 1 ? "reply" : "replies"}
              </span>
            </button>
          </StaggerItem>
        ))}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <DiscussionIcon />
            <p className="text-sm text-(--color-slate)">No discussions yet. Start the first thread.</p>
          </div>
        )}
        </StaggerGroup>
      </div>
    </>
  );
}
