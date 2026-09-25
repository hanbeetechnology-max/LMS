import { useState } from "react";
import { useToast } from "../../lib/ToastProvider";
import { revokeInvitation, type SchoolInvitation } from "../../lib/portalApi";
import { Card, DataTable, ErrorBlock, formatDate, LoadingBlock, StatusBadge } from "../kit";

const small =
  "inline-flex min-h-11 items-center rounded-full border border-(--color-line) px-4 text-sm font-semibold text-(--color-ink) hover:bg-(--color-cloud) disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-(--color-accent)";

export function InvitationsCard({
  invitations,
  loading,
  error,
  reload,
  onResend,
}: {
  invitations: SchoolInvitation[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  /** Called with the email once its expiry has been refreshed, to reopen the mail step. */
  onResend: (email: string) => void | Promise<void>;
}) {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);
  const revokedCount = invitations.filter((i) => i.state === "revoked").length;
  const visible = showRevoked ? invitations : invitations.filter((i) => i.state !== "revoked");

  async function revoke(inv: SchoolInvitation) {
    setBusyId(inv.id);
    const ok = await revokeInvitation(inv.id);
    setBusyId(null);
    setConfirmId(null);
    if (ok) showToast(`Invitation for ${inv.email} revoked`);
    else showToast("Could not revoke this invitation. It may already be used or revoked.", "error");
    reload();
  }


  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Step 3 of 3 · Track who joined</p>
      <h2 className="mt-1 text-lg font-semibold text-(--color-ink)">Invitations</h2>
      <p className="mt-1 mb-4 text-sm text-(--color-slate)">Every invitation your school has sent, and where it stands.</p>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <>
        {revokedCount > 0 && (
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={() => setShowRevoked((v) => !v)} aria-pressed={showRevoked} className={small}>
              {showRevoked ? "Hide revoked" : `Show revoked (${revokedCount})`}
            </button>
          </div>
        )}
        <DataTable
          rows={visible}
          rowKey={(r) => r.id}
          emptyTitle="No invitations yet"
          emptyBody="Invite students above and they will be listed here."
          columns={[
            { key: "email", header: "Email", sortValue: (r) => r.email, render: (r) => <span className="break-all">{r.email}</span> },
            { key: "role", header: "For", sortValue: (r) => r.role, render: (r) => (r.role === "school_staff" ? "Teacher" : "Student") },
            { key: "state", header: "State", sortValue: (r) => r.state, render: (r) => <StatusBadge status={r.state} /> },
            { key: "sent", header: "Sent", sortValue: (r) => r.createdAt, render: (r) => formatDate(r.createdAt) },
            { key: "expires", header: "Expires", sortValue: (r) => r.expiresAt, render: (r) => formatDate(r.expiresAt) },
            {
              key: "actions",
              header: "Actions",
              render: (r) =>
                r.state === "pending" ? (
                  <span className="flex flex-wrap gap-2">
                    {r.role === "student" && (
                      <button type="button" className={small} onClick={() => onResend(r.email)}>
                        Resend
                      </button>
                    )}
                    {confirmId === r.id ? (
                      <>
                        <button type="button" className={`${small} border-(--color-error) text-(--color-error)`} onClick={() => revoke(r)} disabled={busyId === r.id}>
                          Confirm revoke
                        </button>
                        <button type="button" className={small} onClick={() => setConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button type="button" className={small} onClick={() => setConfirmId(r.id)} aria-label={`Revoke invitation for ${r.email}`}>
                        Revoke
                      </button>
                    )}
                  </span>
                ) : r.state === "expired" && r.role === "student" ? (
                  <button type="button" className={small} onClick={() => onResend(r.email)}>Resend</button>
                ) : (
                  <span className="text-(--color-mist)">-</span>
                ),
            },
          ]}
        />
        </>
      )}
    </Card>
  );
}
