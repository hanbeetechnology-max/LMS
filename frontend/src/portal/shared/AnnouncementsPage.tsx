import { useState } from "react";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { useAuth } from "../../lib/AuthProvider";
import { markdownToHtml } from "../../lib/markdown";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../lib/ToastProvider";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, relativeTime, useAsync } from "../kit";

type Audience = "all" | "staff" | "student";

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  orgId: string | null;
  orgName: string | null;
  authorId: string;
  authorName: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface DbRow {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  org_id: string | null;
  author_id: string;
  pinned: boolean;
  created_at: string;
  updated_at: string | null;
  profiles: { full_name: string } | null;
  organizations: { name: string } | null;
}

const COLUMNS = "id, title, body, audience, org_id, author_id, pinned, created_at, updated_at, profiles(full_name), organizations(name)";

async function loadAnnouncements(): Promise<Announcement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("announcements").select(COLUMNS).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown as DbRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    audience: r.audience,
    orgId: r.org_id,
    orgName: r.organizations?.name ?? null,
    authorId: r.author_id,
    authorName: r.profiles?.full_name ?? "Staff",
    pinned: r.pinned,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return rows.sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-violet) focus-visible:ring-2 focus-visible:ring-(--color-violet)/30";
const primaryBtn =
  "min-h-11 rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper) transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";
const ghostBtn =
  "min-h-11 rounded-full border border-(--color-line) px-4 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";

function Editor({
  initial,
  audienceOptions,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: { title: string; body: string; audience: Audience; pinned: boolean };
  audienceOptions: { value: Audience; label: string }[];
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (v: { title: string; body: string; audience: Audience; pinned: boolean }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? audienceOptions[0].value);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [busy, setBusy] = useState(false);

  return (
    <Card className="mb-6">
      <div className="grid gap-4">
        <div>
          <label htmlFor="ann-title" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Title
          </label>
          <input id="ann-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label htmlFor="ann-body" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Message
          </label>
          <RichTextEditor id="ann-body" value={body} onChange={setBody} rows={4} placeholder="Write the announcement" />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-48">
            <label htmlFor="ann-audience" className="mb-1 block text-sm font-medium text-(--color-ink)">
              Who can read it
            </label>
            <select id="ann-audience" className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {audienceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-(--color-ink-soft)">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-(--color-violet)" />
            Pin to the top
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={busy || !title.trim() || !body.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({ title: title.trim(), body: body.trim(), audience, pinned });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </Card>
  );
}

export function AnnouncementsPage() {
  const { profile } = useAuth();
  const { showToast, showUndoToast } = useToast();
  const list = useAsync(loadAnnouncements, []);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const role = profile?.role;
  const schoolOrgId = profile?.school?.memberStatus === "active" ? profile.school.orgId : null;
  const isSchoolStaff = role === "school_staff";
  const canCompose = role === "manager" || role === "staff" || (isSchoolStaff && !!schoolOrgId);

  const audienceOptions: { value: Audience; label: string }[] = isSchoolStaff
    ? [
        { value: "all", label: "Everyone in my school" },
        { value: "student", label: "Students only" },
        { value: "staff", label: "Staff only" },
      ]
    : [
        { value: "all", label: "Everyone" },
        { value: "student", label: "Students" },
        { value: "staff", label: "Staff" },
      ];

  function canManage(a: Announcement): boolean {
    if (!profile) return false;
    if (isSchoolStaff) return !!schoolOrgId && a.orgId === schoolOrgId;
    return a.authorId === profile.id;
  }
  const canDelete = (a: Announcement) => canManage(a) || (role === "manager" && a.orgId === null) || role === "manager";

  async function post(v: { title: string; body: string; audience: Audience; pinned: boolean }) {
    if (!supabase || !profile) return;
    const { error } = await supabase.from("announcements").insert({
      title: v.title,
      body: v.body,
      audience: v.audience,
      pinned: v.pinned,
      org_id: isSchoolStaff ? schoolOrgId : null,
      author_id: profile.id,
    });
    if (error) {
      showToast(`Could not post: ${error.message}`, "error");
      return;
    }
    showToast("Announcement posted.");
    setComposing(false);
    list.reload();
  }

  async function saveEdit(id: string, v: { title: string; body: string; audience: Audience; pinned: boolean }) {
    if (!supabase) return;
    const { error } = await supabase.from("announcements").update({ title: v.title, body: v.body, audience: v.audience, pinned: v.pinned }).eq("id", id);
    if (error) {
      showToast(`Could not save: ${error.message}`, "error");
      return;
    }
    showToast("Announcement updated.");
    setEditingId(null);
    list.reload();
  }

  async function togglePin(a: Announcement) {
    if (!supabase) return;
    const { error } = await supabase.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id);
    if (error) showToast(`Could not change pin: ${error.message}`, "error");
    else list.reload();
  }

  async function remove(a: Announcement) {
    if (!supabase || !profile) return;
    const { data, error } = await supabase.from("announcements").delete().eq("id", a.id).select("id");
    setConfirmDeleteId(null);
    if (error || !data || data.length === 0) {
      showToast(error ? `Could not delete: ${error.message}` : "You are not allowed to delete this announcement.", "error");
      return;
    }
    list.reload();
    showUndoToast("Announcement deleted.", async () => {
      if (!supabase) return;
      const { error: restoreError } = await supabase.from("announcements").insert({
        title: a.title,
        body: a.body,
        audience: a.audience,
        pinned: a.pinned,
        org_id: a.orgId,
        author_id: profile.id,
      });
      if (restoreError) showToast(`Could not restore: ${restoreError.message}`, "error");
      else {
        showToast("Announcement restored.");
        list.reload();
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle={canCompose ? (isSchoolStaff ? "News for your school." : "News for the whole site.") : "News and updates for you."}
        actions={
          canCompose && !composing ? (
            <button type="button" className={primaryBtn} onClick={() => setComposing(true)}>
              New announcement
            </button>
          ) : undefined
        }
      />

      {composing && <Editor audienceOptions={audienceOptions} submitLabel="Post" onCancel={() => setComposing(false)} onSubmit={post} />}

      {list.loading && !list.data ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock onRetry={list.reload} />
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState title="No announcements yet" body="When there is news, it shows up here." />
      ) : (
        <ul className="flex flex-col gap-4">
          {list.data.map((a) => (
            <li key={a.id}>
              {editingId === a.id ? (
                <Editor
                  initial={{ title: a.title, body: a.body, audience: a.audience, pinned: a.pinned }}
                  audienceOptions={audienceOptions}
                  submitLabel="Save changes"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(v) => saveEdit(a.id, v)}
                />
              ) : (
                <Card className={a.pinned ? "border-(--color-amber)/40 bg-(--color-amber-soft)" : ""}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-(--color-ink)">{a.title}</h2>
                    <Badge tone={a.orgId ? "info" : "neutral"}>{a.orgId ? (a.orgName ?? profile?.school?.name ?? "School") : "Whole site"}</Badge>
                    {a.pinned && <Badge tone="warn">Pinned</Badge>}
                    {a.audience !== "all" && <Badge>{a.audience === "student" ? "Students only" : "Staff only"}</Badge>}
                  </div>
                  <div
                    className="mt-2 text-sm leading-relaxed text-(--color-ink-soft) [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(a.body) }}
                  />
                  <p className="mt-3 text-xs text-(--color-mist)">
                    {a.authorName} · {relativeTime(a.createdAt)}
                    {a.updatedAt ? " · edited" : ""}
                  </p>
                  {(canManage(a) || canDelete(a)) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {canManage(a) && (
                        <>
                          <button type="button" className={ghostBtn} onClick={() => setEditingId(a.id)}>
                            Edit
                          </button>
                          <button type="button" className={ghostBtn} onClick={() => togglePin(a)}>
                            {a.pinned ? "Unpin" : "Pin"}
                          </button>
                        </>
                      )}
                      {canDelete(a) &&
                        (confirmDeleteId === a.id ? (
                          <>
                            <span className="text-sm text-(--color-ink)">Delete this announcement?</span>
                            <button type="button" className="min-h-11 rounded-full bg-(--color-error) px-4 text-sm font-semibold text-(--color-paper)" onClick={() => remove(a)}>
                              Yes, delete
                            </button>
                            <button type="button" className={ghostBtn} onClick={() => setConfirmDeleteId(null)}>
                              Keep
                            </button>
                          </>
                        ) : (
                          <button type="button" className={`${ghostBtn} text-(--color-error)`} onClick={() => setConfirmDeleteId(a.id)}>
                            Delete
                          </button>
                        ))}
                    </div>
                  )}
                </Card>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
