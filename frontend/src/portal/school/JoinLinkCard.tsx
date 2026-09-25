import { useState } from "react";
import { useToast } from "../../lib/ToastProvider";
import { fetchSchoolJoinLink, rotateSchoolJoinLink } from "../../lib/portalApi";
import { Card, Eyebrow, useAsync } from "../kit";

const btn =
  "inline-flex min-h-11 items-center rounded-full border border-(--color-line) px-4 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud) disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-(--color-accent)";

/** Always-visible card with the school's shared join link. The owner can replace
 *  it (the old link stops working at once; students already in are unaffected). */
export function JoinLinkCard({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
  const { showToast } = useToast();
  const link = useAsync(() => fetchSchoolJoinLink(orgId), [orgId]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.data ?? "");
      showToast("Invitation link copied");
    } catch {
      showToast("Could not copy. Select the link and copy it by hand.", "error");
    }
  }

  async function replace() {
    setBusy(true);
    const next = await rotateSchoolJoinLink(orgId);
    setBusy(false);
    setConfirming(false);
    if (next) {
      showToast("Join link replaced. Share the new link.");
      link.reload();
    } else showToast("Could not replace the link.", "error");
  }

  return (
    <Card>
      <Eyebrow>Your school's join link</Eyebrow>
      <p className="mt-1 text-sm text-(--color-slate)">Invited students use this link to create their account. Only the emails you invite can join.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={copy} disabled={!link.data} className={btn}>
          Copy join link
        </button>
        <span data-testid="join-link" className="min-w-0 break-all text-xs text-(--color-mist)">{link.data ?? "Loading..."}</span>
      </div>
      {isOwner && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-(--color-slate)">
          {confirming ? (
            <>
              <span>The old link stops working at once. Students who already joined are not affected.</span>
              <button type="button" disabled={busy} onClick={replace} className={btn}>
                {busy ? "Replacing..." : "Yes, replace it"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={btn}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={btn}>
              Replace link
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
