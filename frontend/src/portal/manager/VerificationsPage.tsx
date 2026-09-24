import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../lib/ToastProvider";
import {
  approveHanbeeStaff,
  fetchPendingHanbeeStaff,
  fetchSchoolDirectory,
  rejectSchool,
  setAccountStatus,
  verifySchool,
  type PendingHanbeeStaff,
  type SchoolDirectoryRow,
} from "../../lib/portalApi";
import { Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, formatDate, useAsync } from "../kit";
import { ConfirmDialog, actionButton } from "./ConfirmDialog";

export function VerificationsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [schools, staff] = await Promise.all([fetchSchoolDirectory(), fetchPendingHanbeeStaff()]);
    return { schools: schools.filter((s) => s.status === "pending"), staff };
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectStaff, setRejectStaff] = useState<PendingHanbeeStaff | null>(null);

  async function decideSchool(school: SchoolDirectoryRow, verdict: "verify" | "reject") {
    setBusy(school.orgId);
    const out = verdict === "verify" ? await verifySchool(school.orgId) : await rejectSchool(school.orgId);
    setBusy(null);
    if (!out) showToast("That did not go through. Try again.", "error");
    else if (out.result === "already_decided") showToast(`Already decided by ${out.by ?? "another manager"}`, "error");
    else showToast(out.result === "verified" ? `${school.name} verified` : `${school.name} rejected`);
    reload();
  }

  async function approve(p: PendingHanbeeStaff) {
    setBusy(p.id);
    const ok = await approveHanbeeStaff(p.id);
    setBusy(null);
    showToast(ok ? `${p.fullName} approved` : "That did not go through. Try again.", ok ? "success" : "error");
    reload();
  }

  async function reject(p: PendingHanbeeStaff, reason?: string) {
    setBusy(p.id);
    const ok = await setAccountStatus(p.id, "revoked", reason);
    setBusy(null);
    setRejectStaff(null);
    showToast(ok ? `${p.fullName} rejected` : "That did not go through. Try again.", ok ? "success" : "error");
    reload();
  }

  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock onRetry={reload} />;

  return (
    <>
      <PageHeader title="Verifications" subtitle="Schools and Hanbee staff waiting for approval. The first decision wins." />

      <h2 className="mb-2 font-display text-lg font-semibold text-(--color-ink)">Schools waiting for verification</h2>
      {data.schools.length === 0 ? (
        <EmptyState title="Nothing waiting for you" body="New school registrations will appear here." />
      ) : (
        <ul className="mb-8 grid gap-3">
          {data.schools.map((s) => (
            <li key={s.orgId}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-(--color-ink)">{s.name}</p>
                  <p className="text-sm text-(--color-slate)">
                    {s.ownerName ?? "Unknown owner"} {s.ownerEmail ? `(${s.ownerEmail})` : ""}
                  </p>
                  <p className="text-xs text-(--color-mist)">Submitted {formatDate(s.createdAt)}</p>
                  <Link to={`/manager/schools/${s.orgId}`} className="text-sm font-medium text-(--color-ink) underline">
                    View school
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy === s.orgId} onClick={() => decideSchool(s, "verify")} className={actionButton}>Verify</button>
                  <button type="button" disabled={busy === s.orgId} onClick={() => decideSchool(s, "reject")} className={actionButton}>Reject</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 font-display text-lg font-semibold text-(--color-ink)">Hanbee staff applications</h2>
      {data.staff.length === 0 ? (
        <EmptyState title="Nothing waiting for you" body="Staff applications will appear here." />
      ) : (
        <ul className="grid gap-3">
          {data.staff.map((p) => (
            <li key={p.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-(--color-ink)">{p.fullName}</p>
                  <p className="text-sm text-(--color-slate)">{p.email}</p>
                  <p className="text-xs text-(--color-mist)">Applied {formatDate(p.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy === p.id} onClick={() => approve(p)} className={actionButton}>Approve</button>
                  <button type="button" disabled={busy === p.id} onClick={() => setRejectStaff(p)} className={actionButton}>Reject</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {rejectStaff && (
        <ConfirmDialog
          title={`Reject ${rejectStaff.fullName}?`}
          body="Their application will be turned down and the account revoked."
          confirmLabel="Reject application"
          askReason
          busy={busy === rejectStaff.id}
          onConfirm={(reason) => reject(rejectStaff, reason)}
          onCancel={() => setRejectStaff(null)}
        />
      )}
    </>
  );
}
