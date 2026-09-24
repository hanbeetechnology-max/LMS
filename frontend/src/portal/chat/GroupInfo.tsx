import { useState } from "react";
import { motion } from "framer-motion";
import type { ChatContact, ChatMember, ConversationSummary } from "../../lib/chatApi";
import { useToast } from "../../lib/ToastProvider";
import { Avatar } from "../kit";
import { addMemberDetailed, removeMemberDetailed } from "./chatExtras";
import { ContactPicker } from "./NewChatPanel";
import { convName } from "./util";

interface Props {
  conv: ConversationSummary;
  members: ChatMember[];
  meId: string;
  onChanged: () => void;
  onClose: () => void;
}

export function GroupInfo({ conv, members, meId, onChanged, onClose }: Props) {
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canManage = members.some((m) => m.canAdd);

  async function add(contact: ChatContact) {
    setBusy(true);
    const r = await addMemberDetailed(conv.id, contact.userId);
    setBusy(false);
    if (r.ok) {
      showToast(`${contact.fullName} added.`);
      setAdding(false);
      onChanged();
    } else showToast(r.message, "error");
  }

  async function remove(m: ChatMember) {
    setBusy(true);
    const r = await removeMemberDetailed(conv.id, m.userId);
    setBusy(false);
    setConfirmId(null);
    if (r.ok) {
      showToast(`${m.fullName} removed.`);
      onChanged();
    } else showToast(r.message, "error");
  }

  return (
    <motion.aside
      role="dialog"
      aria-label="Group info"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-(--color-line) bg-(--color-paper) shadow-2xl md:w-[380px]"
    >
      {adding ? (
        <ContactPicker title="Add member" excludeIds={members.map((m) => m.userId)} busy={busy} onPick={add} onClose={() => setAdding(false)} />
      ) : (
        <>
          <div className="flex h-[60px] shrink-0 items-center gap-2 bg-(--wa-header) px-2">
            <button type="button" onClick={onClose} aria-label="Close group info" className="flex h-11 w-11 items-center justify-center rounded-full text-(--color-ink-soft) hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:outline-(--wa-green)">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <h2 className="font-display text-base font-semibold text-(--color-ink)">Group info</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col items-center gap-2 border-b border-(--color-line) px-6 py-6">
              <Avatar name={convName(conv)} size={88} />
              <p className="text-center font-display text-xl font-semibold text-(--color-ink)">{convName(conv)}</p>
              <p className="text-sm text-(--color-slate)">Group, {members.length} members</p>
            </div>
            <div className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-(--wa-green-text)">{members.length} members</div>
            {canManage && (
              <button type="button" onClick={() => setAdding(true)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[15px] font-medium text-(--color-ink) hover:bg-(--color-cloud) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--wa-green)">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--wa-green) text-white">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                Add member
              </button>
            )}
            <ul role="list">
              {members.map((m) => (
                <li key={m.userId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <Avatar name={m.fullName} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-(--color-ink)">
                      {m.fullName}
                      {m.userId === meId && <span className="text-(--color-slate)"> (You)</span>}
                    </p>
                    {confirmId === m.userId && <p className="text-xs text-(--color-slate)">Remove from this group?</p>}
                  </div>
                  {m.memberRole === "admin" && <span className="rounded border border-(--wa-green) px-1.5 py-0.5 text-[11px] font-medium text-(--wa-green-text)">Group admin</span>}
                  {m.memberRole === "member" && <span className="sr-only">Member</span>}
                  {m.canRemove && m.userId !== meId &&
                    (confirmId === m.userId ? (
                      <span className="flex gap-1">
                        <button type="button" onClick={() => setConfirmId(null)} className="min-h-11 rounded-lg px-3 text-sm text-(--color-ink-soft) hover:bg-(--color-cloud)">
                          Cancel
                        </button>
                        <button type="button" disabled={busy} onClick={() => void remove(m)} className="min-h-11 rounded-lg bg-(--color-error) px-3 text-sm font-semibold text-white disabled:opacity-60">
                          Remove
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmId(m.userId)} aria-label={`Remove ${m.fullName}`} className="min-h-11 rounded-lg px-3 text-sm font-medium text-(--color-error) hover:bg-(--color-error-soft) focus-visible:outline-2 focus-visible:outline-(--wa-green)">
                        Remove
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </motion.aside>
  );
}
