import { useEffect, useState } from "react";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { InlineEditText } from "../../components/ui/InlineEditText";
import { useToast } from "../../lib/ToastProvider";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import {
  INITIAL_APPLICANTS,
  STARTING_ROLL_SEQUENCE,
  type VerificationApplicant,
  type VerificationStatus,
} from "../../lib/mockVerifications";

interface PendingStaff {
  id: string;
  fullName: string;
  email: string;
}

const STATUS_STYLES: Record<VerificationStatus, string> = {
  pending: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  verified: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  declined: "bg-(--color-cloud) text-(--color-slate)",
};

function rollNoFor(seq: number) {
  return `STU-2026-${String(seq).padStart(3, "0")}`;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-(--color-mist) transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ManagerVerificationsPage() {
  const { showToast, showUndoToast } = useToast();
  const { authSource } = useAuth();
  const [applicants, setApplicants] = useState(INITIAL_APPLICANTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nextSeq, setNextSeq] = useState(STARTING_ROLL_SEQUENCE);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase) return;
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "staff")
      .eq("approved", false)
      .then(({ data, error }) => {
        if (error || !data) return;
        setPendingStaff(data.map((row) => ({ id: row.id, fullName: row.full_name, email: row.email })));
      });
  }, [authSource]);

  async function approveStaff(staff: PendingStaff) {
    if (!supabase) return;
    setApprovingId(staff.id);
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", staff.id);
    setApprovingId(null);
    if (error) {
      showToast(`Couldn't approve ${staff.fullName} — try again.`);
      return;
    }
    setPendingStaff((prev) => prev.filter((s) => s.id !== staff.id));
    showToast(`${staff.fullName} approved — they can now sign in.`);
  }

  function updateField(id: string, patch: Partial<VerificationApplicant>) {
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function decline(applicant: VerificationApplicant) {
    updateField(applicant.id, { status: "declined" });
    showToast(`${applicant.name}'s application declined.`);
  }

  function verify(applicant: VerificationApplicant) {
    if (!applicant.institution.trim() || !applicant.phone.trim() || !applicant.age) {
      setErrorById((prev) => ({ ...prev, [applicant.id]: "Age, institution, and phone are required before verifying." }));
      return;
    }
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[applicant.id];
      return next;
    });

    const seq = nextSeq;
    const rollNo = rollNoFor(seq);
    setNextSeq(seq + 1);
    updateField(applicant.id, { status: "verified", rollNo });

    showUndoToast(`${applicant.name} verified — Roll No: ${rollNo}.`, () => {
      updateField(applicant.id, { status: "pending", rollNo: null });
      setNextSeq((current) => Math.min(current, seq));
    });
  }

  return (
    <>
      <Seo title="Verifications" description="Review and enroll new applicants." path="/manager/verifications" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Verifications</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">
          Review applicants, correct their details if needed, and verify them to generate a roll number.
        </p>
      </Reveal>

      {pendingStaff.length > 0 && (
        <Reveal delay={0.05} className="mt-8">
          <h3 className="font-display text-lg font-semibold text-(--color-ink)">Pending staff approval</h3>
          <p className="mt-1 text-sm text-(--color-slate)">
            These staff accounts self-registered and can't sign in until you approve them.
          </p>
          <StaggerGroup className="mt-4 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
            {pendingStaff.map((staff) => (
              <StaggerItem key={staff.id} y={12}>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-(--color-ink)">{staff.fullName}</p>
                    <p className="truncate text-xs text-(--color-mist)">{staff.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-(--color-amber-soft) px-2.5 py-0.5 text-xs font-medium text-(--color-amber-deep)">
                    pending
                  </span>
                  <button
                    type="button"
                    disabled={approvingId === staff.id}
                    onClick={() => approveStaff(staff)}
                    className="shrink-0 rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60"
                  >
                    {approvingId === staff.id ? "Approving…" : "Approve"}
                  </button>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Reveal>
      )}

      <StaggerGroup className="mt-8 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
        {applicants.map((applicant) => {
          const expanded = expandedId === applicant.id;
          const error = errorById[applicant.id];
          return (
            <StaggerItem key={applicant.id} y={12}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : applicant.id)}
                aria-expanded={expanded}
                className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-(--color-cloud)"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--color-ink)">{applicant.name}</p>
                  <p className="truncate text-xs text-(--color-mist)">
                    {applicant.email} · {applicant.course} · {applicant.submittedDate}
                  </p>
                </div>
                {applicant.rollNo && (
                  <span className="shrink-0 rounded-full border border-(--color-line) px-2.5 py-0.5 font-mono text-xs font-medium text-(--color-ink-soft)">
                    {applicant.rollNo}
                  </span>
                )}
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[applicant.status]}`}>
                  {applicant.status}
                </span>
                <ChevronIcon expanded={expanded} />
              </button>

              {expanded && (
                <div className="border-t border-(--color-line) bg-(--color-cloud)/40 px-5 py-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <InlineEditText
                      label="Age"
                      type="number"
                      value={String(applicant.age)}
                      onChange={(v) => updateField(applicant.id, { age: Number(v) || 0 })}
                    />
                    <InlineEditText
                      label="Institution"
                      value={applicant.institution}
                      onChange={(v) => updateField(applicant.id, { institution: v })}
                      placeholder="Add institution"
                    />
                    <InlineEditText
                      label="Phone"
                      type="tel"
                      value={applicant.phone}
                      onChange={(v) => updateField(applicant.id, { phone: v })}
                      placeholder="Add phone"
                    />
                  </div>

                  {error && (
                    <p role="alert" className="mt-3 text-xs text-(--color-error)">
                      {error}
                    </p>
                  )}

                  {applicant.status === "pending" && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => verify(applicant)}
                        className="rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
                      >
                        Verify & Enroll
                      </button>
                      <button
                        type="button"
                        onClick={() => decline(applicant)}
                        className="rounded-full bg-(--color-cloud) px-4 py-2 text-sm font-medium text-(--color-error) transition-colors hover:bg-(--color-error-soft)"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}
            </StaggerItem>
          );
        })}
        {applicants.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No applicants right now.</p>
        )}
      </StaggerGroup>
    </>
  );
}
