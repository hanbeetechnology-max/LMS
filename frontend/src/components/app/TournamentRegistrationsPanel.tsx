import { useEffect, useState } from "react";
import {
  fetchPendingTournamentRegistrations,
  verifyTournamentRegistration,
  type PendingTournamentRegistration,
} from "../../lib/tournamentApi";
import { useAuth } from "../../lib/AuthProvider";
import { useToast } from "../../lib/ToastProvider";

/** Staff/manager view of pending RC tournament registrations — mirrors
 *  AssessmentReviewPanel.tsx's shape exactly (same "pending list + one
 *  action button" pattern). Payment is optional right now (see
 *  TournamentPage.tsx), so `paymentConfirmed` is shown for context, not as
 *  a gate — staff can verify a registration whether or not the driver
 *  claims to have paid. */
export function TournamentRegistrationsPanel() {
  const { authSource } = useAuth();
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState<PendingTournamentRegistration[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authSource !== "supabase") return;
    fetchPendingTournamentRegistrations()
      .then(setRegistrations)
      .catch(() => setError("Couldn't load tournament registrations."));
  }, [authSource]);

  async function verify(id: string, driverName: string) {
    const ok = await verifyTournamentRegistration(id);
    if (ok) {
      setRegistrations((current) => current.filter((r) => r.id !== id));
      showToast(`${driverName} verified for the tournament.`);
    } else {
      setError("Couldn't verify this registration.");
    }
  }

  if (authSource !== "supabase" || (!error && registrations.length === 0)) return null;

  return (
    <section className="mt-8 rounded-2xl border border-(--color-line) p-6">
      <h3 className="font-display text-lg font-semibold text-(--color-ink)">RC tournament registrations</h3>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-(--color-error)">{error}</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-(--color-line)">
          {registrations.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-(--color-ink-soft)">{r.driverName}</p>
                <p className="text-xs text-(--color-mist)">
                  {r.email}
                  {r.phone ? ` · ${r.phone}` : ""} · {r.paymentConfirmed ? "claims paid" : "no payment claimed"} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => verify(r.id, r.driverName)}
                className="rounded-full bg-(--color-ink) px-4 py-2 text-xs font-semibold text-(--color-paper)"
              >
                Verify
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
