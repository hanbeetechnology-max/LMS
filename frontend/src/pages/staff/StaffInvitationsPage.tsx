import { type FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { useToast } from "../../lib/ToastProvider";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";

interface InvitationsLocationState {
  prefillEmail?: string;
}

type Status = "pending" | "accepted" | "expired" | "revoked";

interface Invitation {
  id: string;
  email: string;
  section: string;
  sentDate: string;
  status: Status;
  sectionId?: string;
}

const SECTIONS = ["Intro to Design — Section B", "Data Structures"];

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  accepted: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  expired: "bg-(--color-cloud) text-(--color-slate)",
  revoked: "bg-(--color-error-soft) text-(--color-error)",
};

const INITIAL: Invitation[] = [
  { id: "1", email: "sofia@student.edu", section: "Intro to Design — Section B", sentDate: "2 days ago", status: "pending" },
  { id: "2", email: "noah@student.edu", section: "Intro to Design — Section B", sentDate: "5 days ago", status: "accepted" },
  { id: "3", email: "olivia@student.edu", section: "Data Structures", sentDate: "1 week ago", status: "expired" },
];

export function StaffInvitationsPage() {
  const { showToast } = useToast();
  const { authSource, profile } = useAuth();
  const location = useLocation();
  const prefillEmail = (location.state as InvitationsLocationState | null)?.prefillEmail;
  const [invitations, setInvitations] = useState(INITIAL);
  const [emails, setEmails] = useState(prefillEmail ?? "");
  const [section, setSection] = useState(SECTIONS[0]);
  const [sectionOptions, setSectionOptions] = useState(SECTIONS);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase || !profile) return;

    setLoading(true);
    Promise.all([
      supabase.from("sections").select("id, name").order("name"),
      supabase
        .from("invitations")
        .select("id, email, accepted, created_at, section_id, sections(name)")
        .eq("invited_by", profile.id)
        .order("created_at", { ascending: false }),
    ])
      .then(([sectionsResult, invitationsResult]) => {
        if (sectionsResult.error || invitationsResult.error) {
          setError("Couldn't load invitations right now.");
          return;
        }
        const nextSections = (sectionsResult.data ?? []) as { id: string; name: string }[];
        if (nextSections.length > 0) {
          setSectionOptions(nextSections.map((item) => item.name));
          setSection(nextSections[0].name);
        }
        const nextInvitations = (invitationsResult.data ?? []).map((inv) => {
          const sectionRecord = inv.sections as unknown as { name: string } | null;
          return {
            id: inv.id,
            email: inv.email,
            section: sectionRecord?.name ?? "Unassigned section",
            sectionId: inv.section_id ?? undefined,
            sentDate: new Date(inv.created_at).toLocaleDateString(),
            status: inv.accepted ? ("accepted" as Status) : ("pending" as Status),
          };
        });
        setInvitations(nextInvitations);
      })
      .finally(() => setLoading(false));
  }, [authSource, profile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const parsed = emails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;

    const invalid = parsed.filter((email) => !/^\S+@\S+\.\S+$/.test(email));
    if (invalid.length > 0) {
      setError(`Not a valid email address: ${invalid.join(", ")}`);
      return;
    }

    const newInvites: Invitation[] = parsed.map((email) => ({
      id: crypto.randomUUID(),
      email,
      section,
      sentDate: "Just now",
      status: "pending",
    }));
    if (authSource === "supabase" && supabase && profile) {
      setLoading(true);
      const client = supabase;
      try {
        const { data: selectedSection, error: sectionError } = await client
          .from("sections")
          .select("id, name")
          .eq("name", section)
          .single();
          if (sectionError || !selectedSection) {
            setError("Couldn't find that section. Refresh and try again.");
            return;
          }
          const { data, error: insertError } = await client
            .from("invitations")
            .insert(parsed.map((email) => ({ email, role: "student", section_id: selectedSection.id, invited_by: profile.id })))
            .select("id, email, accepted, created_at, section_id");
          if (insertError || !data) {
            setError(insertError?.message ?? "Couldn't create invitations.");
            return;
          }
          setInvitations((prev) => [
            ...data.map((inv) => ({ id: inv.id, email: inv.email, section, sectionId: inv.section_id, sentDate: "Just now", status: "pending" as Status })),
            ...prev,
          ]);
          setMessage(`${parsed.length} invitation${parsed.length > 1 ? "s" : ""} created for ${section}.`);
          setEmails("");
      } finally {
        setLoading(false);
      }
      return;
    }

    setInvitations((prev) => [...newInvites, ...prev]);
    setMessage(`${parsed.length} invitation${parsed.length > 1 ? "s" : ""} sent to ${section}.`);
    setEmails("");
  }

  async function resend(id: string) {
    const inv = invitations.find((i) => i.id === id);
    if (authSource === "supabase" && supabase) {
      const { error: resendError } = await supabase.from("invitations").update({ created_at: new Date().toISOString(), accepted: false }).eq("id", id);
      if (resendError) {
        setError("Couldn't resend that invitation.");
        return;
      }
    }
    setInvitations((prev) => prev.map((inv) => (inv.id === id ? { ...inv, sentDate: "Just now", status: "pending" } : inv)));
    showToast(`Invitation resent to ${inv?.email}.`);
  }

  async function revoke(id: string) {
    const inv = invitations.find((i) => i.id === id);
    if (authSource === "supabase" && supabase) {
      const { error: revokeError } = await supabase.from("invitations").delete().eq("id", id);
      if (revokeError) {
        setError("Couldn't revoke that invitation.");
        return;
      }
    }
    setInvitations((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: "revoked" } : inv)));
    showToast(`Invitation to ${inv?.email} revoked.`);
  }

  return (
    <>
      <Seo title="Invitations" description="Invite students to your course sections." path="/staff/invitations" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Invitations</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Invite students to a section by email.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emails" className="text-sm font-medium text-(--color-ink-soft)">
              Student emails
            </label>
            <textarea
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="One email per line, or comma-separated…"
              rows={3}
              className="resize-none rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="section" className="text-sm font-medium text-(--color-ink-soft)">
              Section
            </label>
            <select
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 focus:border-(--color-violet)"
            >
              {sectionOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-(--color-error-soft) px-4 py-3 text-sm text-(--color-error)">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="rounded-xl bg-(--color-teal-soft) px-4 py-3 text-sm text-(--color-teal-deep)">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={!emails.trim() || loading}
            className="self-start rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Saving…" : "Send invitations"}
          </button>
        </form>
      </Reveal>

      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">Pending &amp; sent</h3>
        <StaggerGroup className="mt-4 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
          {invitations.map((inv) => (
            <StaggerItem key={inv.id} y={12} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--color-ink)">{inv.email}</p>
                <p className="truncate text-xs text-(--color-mist)">
                  {inv.section} · {inv.sentDate}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status]}`}>
                {inv.status}
              </span>
              <div className="flex shrink-0 gap-3 text-xs font-medium">
                {(inv.status === "pending" || inv.status === "expired") && (
                  <button type="button" onClick={() => resend(inv.id)} className="text-(--color-ink-soft) hover:text-(--color-ink)">
                    Resend
                  </button>
                )}
                {inv.status === "pending" && (
                  <button type="button" onClick={() => revoke(inv.id)} className="text-(--color-error) hover:text-(--color-error)/80">
                    Revoke
                  </button>
                )}
              </div>
            </StaggerItem>
          ))}
          {invitations.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No invitations yet.</p>
          )}
        </StaggerGroup>
      </div>
    </>
  );
}
