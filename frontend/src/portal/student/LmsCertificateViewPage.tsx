import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { fetchMyCertificates, verifyUrlFor } from "../../lib/certificatesApi";
import { EmptyState, ErrorBlock, LoadingBlock, formatDate, useAsync } from "../kit";
import { primaryBtn, secondaryBtn } from "./shared";

/** Printable certificate. The `.cert-print` rules hide everything else when printing. */
export function LmsCertificateViewPage() {
  const { certificateId = "" } = useParams();
  const { profile } = useAuth();
  const { data, loading, error, reload } = useAsync(fetchMyCertificates, []);
  const cert = (data ?? []).find((c) => c.id === certificateId);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock onRetry={reload} />;
  if (!cert) {
    return (
      <EmptyState
        title="Certificate not found"
        body="This certificate does not belong to your account or does not exist."
        action={
          <Link to="/student/lms/certificates" className={primaryBtn}>
            Back to certificates
          </Link>
        }
      />
    );
  }
  const url = verifyUrlFor(cert.id);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .cert-print, .cert-print * { visibility: visible !important; }
          .cert-print { position: absolute; left: 0; top: 0; width: 100%; border: 2px solid #111 !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/student/lms/certificates" className={secondaryBtn}>
          Back to certificates
        </Link>
        <button type="button" onClick={() => window.print()} className={primaryBtn}>
          Print
        </button>
      </div>
      <div className="flex justify-center">
        <article aria-label="Certificate of completion" className="cert-print w-full max-w-3xl rounded-2xl border-2 border-(--color-ink) bg-white p-8 text-center sm:p-14">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-(--color-mist)">Certificate of completion</p>
          <p className="mt-8 text-sm text-(--color-slate)">This certifies that</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--color-ink) sm:text-4xl">{profile?.fullName ?? "Student"}</h1>
          <p className="mt-6 text-sm text-(--color-slate)">has successfully completed</p>
          <p className="mt-2 text-xl font-semibold text-(--color-ink) sm:text-2xl">{cert.courseTitle}</p>
          <div className="mx-auto mt-8 h-px w-24 bg-(--color-line)" />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-sm text-(--color-slate)">
            <span>Issued {formatDate(cert.issuedAt)}</span>
            <span className="font-mono">Serial {cert.serial}</span>
          </div>
          <p className="mt-6 break-all text-xs text-(--color-mist)">Verify at {url}</p>
          <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-(--color-ink)">HANBEE</p>
        </article>
      </div>
    </>
  );
}
