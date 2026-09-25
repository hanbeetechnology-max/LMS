import { useMemo, useState } from "react";
import { extractCertificateId, fetchCertificatesOverview, verifyCertificate, verifyUrlFor, type CertificateOverviewRow, type VerifiedCertificate } from "../../../lib/certificatesApi";
import { useToast } from "../../../lib/ToastProvider";
import { Card, ErrorBlock, Eyebrow, formatDate, LoadingBlock, PageHeader, StatCard, useAsync } from "../../kit";
import { CertificatesTable, darkBtn, inputCls } from "./parts";

/** Certificates overview for Hanbee staff and the manager. Both may verify an id; nothing here edits data. */
export function CertificatesView({ readOnly = false }: { readOnly?: boolean }) {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(fetchCertificatesOverview, []);
  const [query, setQuery] = useState("");
  const [paste, setPaste] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; cert?: VerifiedCertificate } | null>(null);

  const rows = data ?? [];
  const stats = useMemo(() => {
    const now = new Date();
    const month = rows.filter((r) => {
      const d = new Date(r.issuedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return { total: rows.length, month, students: new Set(rows.map((r) => r.studentId)).size };
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.studentName, r.studentEmail, r.schoolName ?? "", r.courseTitle, r.serial].some((s) => s.toLowerCase().includes(q)));
  }, [rows, query]);

  async function copy(row: CertificateOverviewRow) {
    try {
      await navigator.clipboard.writeText(verifyUrlFor(row.certificateId));
      showToast("Verify link copied.");
    } catch {
      showToast("Could not copy. Select the link from the View page instead.", "error");
    }
  }

  async function check() {
    const id = extractCertificateId(paste);
    if (!id) return;
    setChecking(true);
    setResult(null);
    const cert = await verifyCertificate(id);
    setResult(cert ? { ok: true, cert } : { ok: false });
    setChecking(false);
  }

  return (
    <>
      <PageHeader title="Certificates" subtitle={readOnly ? "Every certificate issued so far. This page is read-only." : "Certificates students have earned, and a quick way to check one."} />
      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Total issued" value={stats.total} />
            <StatCard label="This month" value={stats.month} tone="good" />
            <StatCard label="Students with a certificate" value={stats.students} />
          </div>

          <Card>
            <Eyebrow>Verify a certificate</Eyebrow>
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void check();
              }}
            >
              <div className="min-w-0 flex-1 basis-64">
                <label htmlFor="verify-paste" className="mb-1 block text-sm text-(--color-ink)">
                  Certificate id or verify link
                </label>
                <input id="verify-paste" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste an id or https://.../verify/..." className={inputCls} />
              </div>
              <button type="submit" disabled={checking || !paste.trim()} className={darkBtn}>
                {checking ? "Checking..." : "Verify"}
              </button>
            </form>
            {result && (
              <p role="status" className={`mt-3 text-sm font-medium ${result.ok ? "text-(--color-teal-deep)" : "text-(--color-error)"}`}>
                {result.ok && result.cert
                  ? `Valid: ${result.cert.userName} completed ${result.cert.courseTitle} on ${formatDate(result.cert.issuedAt)} (serial ${result.cert.serial}).`
                  : "Not found: no certificate matches that id."}
              </p>
            )}
          </Card>

          <div className="w-full sm:max-w-xs">
            <label htmlFor="cert-search" className="mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">
              Search
            </label>
            <input id="cert-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Student, school, course or serial" className={inputCls} />
          </div>
          <CertificatesTable rows={shown} withCopy onCopy={(r) => void copy(r)} emptyTitle={query ? "No certificates match" : "No certificates yet"} emptyBody={query ? "Try a different search." : "A certificate is issued when a student completes every lesson of a course."} />
        </div>
      )}
    </>
  );
}
