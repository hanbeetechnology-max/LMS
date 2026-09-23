import { useState } from "react";

/**
 * A static "scan to pay" step — no payment API, no gateway integration.
 * Just shows a UPI/GPay-style QR code image (drop the real one at
 * public/payment-qr.png) and requires the applicant to confirm they've
 * paid before the form can submit. Payment itself is verified manually by
 * staff afterward (matches this app's existing manual-verification
 * patterns — ManagerVerificationsPage, staff approval), not automatically.
 */
export function ScanToPayCard({
  amountLabel,
  confirmed,
  onConfirmedChange,
}: {
  amountLabel: string;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="rounded-2xl border border-(--color-line) p-5">
      <p className="text-sm font-medium text-(--color-ink)">Scan to pay — {amountLabel}</p>
      <p className="mt-1 text-xs text-(--color-mist)">
        Scan with any UPI app (GPay, PhonePe, Paytm). This checkbox is just your confirmation — a staff member
        manually checks the payment against your name/email before your spot is finalized.
      </p>
      <div className="mt-4 flex justify-center">
        {imgError ? (
          <div className="flex h-40 w-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-(--color-line) bg-(--color-cloud) p-3 text-center">
            <span className="text-xs text-(--color-mist)">QR code not set up yet</span>
          </div>
        ) : (
          <img
            src="/payment-qr.png"
            alt="Scan this QR code with a UPI app to pay"
            className="h-40 w-40 rounded-xl border border-(--color-line) object-contain"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <label className="mt-4 flex items-start gap-2.5 text-sm text-(--color-ink-soft)">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-(--color-line) accent-(--color-violet)"
        />
        I've completed the payment via QR scan
      </label>
    </div>
  );
}
