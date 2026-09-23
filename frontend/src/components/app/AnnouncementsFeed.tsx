import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem } from "../ui/Reveal";
import { RichTextEditor } from "../ui/RichTextEditor";
import { AnnouncementIcon } from "../landing/icons";
import { useToast } from "../../lib/ToastProvider";
import { useAuth } from "../../lib/AuthProvider";
import { markdownToHtml } from "../../lib/markdown";
import { supabase } from "../../lib/supabaseClient";

function timeAgo(createdAtSeconds: number): string {
  const diffMinutes = Math.max(0, (Date.now() / 1000 - createdAtSeconds) / 60);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${Math.floor(diffMinutes)}m ago`;
  const diffHours = diffMinutes / 60;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  scope: string;
  author: string;
  date: string;
  pinned: boolean;
}

function AnnouncementCard({ item }: { item: Announcement }) {
  return (
    <StaggerItem
      y={12}
      className={`rounded-2xl border p-5 ${
        item.pinned ? "border-(--color-amber)/30 bg-(--color-amber-soft)" : "border-(--color-line)"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-paper) text-(--color-amber)">
          <AnnouncementIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-(--color-ink)">{item.title}</p>
            {item.pinned && (
              <span className="rounded-full bg-(--color-amber) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-paper)">
                Pinned
              </span>
            )}
          </div>
          <div
            className="mt-1.5 text-sm leading-relaxed text-(--color-ink-soft) [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(item.body) }}
          />
          <p className="mt-2 text-xs text-(--color-mist)">
            {item.author} · {item.scope} · {item.date}
          </p>
        </div>
      </div>
    </StaggerItem>
  );
}

const SCOPES = ["Intro to Design — Section B", "Data Structures", "All my courses"];

function Composer({
  onCancel,
  onPost,
}: {
  onCancel: () => void;
  onPost: (a: Omit<Announcement, "id" | "date" | "author">) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState(SCOPES[0]);
  const [pinned, setPinned] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="mb-6 rounded-2xl border border-(--color-line) p-5">
        <div className="flex items-center justify-between gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="min-w-0 flex-1 border-none bg-transparent text-[15px] font-medium text-(--color-ink) outline-none placeholder:text-(--color-mist)"
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="shrink-0 rounded-full border border-(--color-line) bg-(--color-paper) px-3 py-1.5 text-xs font-medium text-(--color-ink-soft) outline-none transition-colors focus:border-(--color-violet)"
          >
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <RichTextEditor value={body} onChange={setBody} placeholder="Write your announcement…" rows={3} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-(--color-ink-soft)">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-(--color-line) accent-(--color-amber)"
            />
            Pin this announcement
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink)"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() => {
                onPost({
                  title: title.trim(),
                  body: body.trim(),
                  scope,
                  pinned,
                });
              }}
              className="rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AnnouncementsFeed({ canCompose = false }: { canCompose?: boolean }) {
  const { showToast } = useToast();
  const { authSource, profile } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase) return;
    let ignore = false;
    supabase
      .from("announcements")
      .select("id, title, body, audience, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (ignore || error || !data) return;
        setItems(
          data.map((row) => ({
            id: row.id,
            title: row.title,
            body: row.body,
            scope: row.audience === "all" ? "All my courses" : row.audience,
            author: (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Staff",
            date: timeAgo(new Date(row.created_at).getTime() / 1000),
            pinned: false,
          })),
        );
      });
    return () => {
      ignore = true;
    };
  }, [authSource]);

  async function handlePost(newAnnouncement: Omit<Announcement, "id" | "date" | "author">) {
    if (authSource !== "supabase" || !supabase || !profile) {
      showToast("Failed to post announcement. Please try again.");
      return;
    }
    const audienceValue: "all" | "staff" | "student" =
      newAnnouncement.scope === "All my courses" ? "all" : newAnnouncement.scope === "Staff" ? "staff" : "student";

    const { data, error } = await supabase
      .from("announcements")
      .insert({ title: newAnnouncement.title, body: newAnnouncement.body, audience: audienceValue, author_id: profile.id })
      .select("id")
      .single();

    if (data && !error) {
      const createdItem: Announcement = {
        ...newAnnouncement,
        id: data.id,
        author: profile.fullName,
        date: "Just now",
      };
      setItems((prev) => [createdItem, ...prev]);
      setComposing(false);
      showToast(`Announcement posted to ${newAnnouncement.scope}.`);
    } else {
      showToast("Failed to post announcement. Please try again.");
    }
  }

  const sorted = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <>
      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Announcements</h2>
          <p className="mt-1 text-[15px] text-(--color-slate)">Updates from your instructors.</p>
        </div>
        {canCompose && !composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            + New announcement
          </button>
        )}
      </Reveal>

      <div className="mt-8">
        <AnimatePresence>
          {composing && (
            <Composer onCancel={() => setComposing(false)} onPost={handlePost} />
          )}
        </AnimatePresence>

        <StaggerGroup className="flex flex-col gap-4">
          {sorted.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </StaggerGroup>
      </div>
    </>
  );
}