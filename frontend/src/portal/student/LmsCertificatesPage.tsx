import { Link } from "react-router-dom";
import { fetchMyCertificates, verifyUrlFor } from "../../lib/certificatesApi";
import { fetchMyCourseProgress } from "../../lib/portalApi";
import { useToast } from "../../lib/ToastProvider";
import { Card, EmptyState, ErrorBlock, Eyebrow, LoadingBlock, PageHeader, formatDate, useAsync } from "../kit";
import { ProgressBar } from "./LmsOverviewPage";
import { primaryBtn, secondaryBtn } from "./shared";

export function LmsCertificatesPage() {
  const { showToast } = useToast();
  const certs = useAsync(fetchMyCertificates, []);
  const progress = useAsync(fetchMyCourseProgress, []);

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(verifyUrlFor(id));
      showToast("Verify link copied.");
    } catch {
      showToast("Could not copy the link.", "error");
    }
  }

  const loading = (certs.loading && !certs.data) || (progress.loading && !progress.data);
  const earned = certs.data ?? [];
  const earnedTitles = new Set(earned.map((c) => c.courseTitle));
  const toEarn = (progress.data ?? []).filter((c) => !earnedTitles.has(c.courseTitle));

  return (
    <>
      <PageHeader title="Certificates" subtitle="Proof of the courses you have completed." />
      {loading ? (
        <LoadingBlock />
      ) : certs.error || progress.error ? (
        <ErrorBlock
          onRetry={() => {
            certs.reload();
            progress.reload();
          }}
        />
      ) : (
        <div className="space-y-8">
          <section aria-label="Earned certificates">
            <h2 className="mb-3 text-lg font-semibold text-(--color-ink)">Earned</h2>
            {earned.length === 0 ? (
              <EmptyState title="No certificates yet" body="Finish every lesson of a course and your certificate appears here." action={<Link to="/student/lms/courses" className={primaryBtn}>Go to my courses</Link>} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {earned.map((c) => (
                  <Card key={c.id}>
                    <Eyebrow>Certificate of completion</Eyebrow>
                    <h3 className="mt-2 text-lg font-semibold text-(--color-ink)">{c.courseTitle}</h3>
                    <p className="mt-1 text-sm text-(--color-slate)">Issued {formatDate(c.issuedAt)}</p>
                    <p className="mt-1 font-mono text-xs text-(--color-mist)">Serial {c.serial}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link to={`/student/lms/certificates/${c.id}`} className={primaryBtn}>
                        View and print
                      </Link>
                      <button type="button" onClick={() => void copy(c.id)} className={secondaryBtn}>
                        Copy verify link
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Still to earn">
            <h2 className="mb-3 text-lg font-semibold text-(--color-ink)">Still to earn</h2>
            {toEarn.length === 0 ? (
              <Card>
                <p className="text-sm text-(--color-slate)">{(progress.data ?? []).length === 0 ? "You are not enrolled in a course yet." : "You have a certificate for every course you are enrolled in."}</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {toEarn.map((c) => (
                  <Card key={c.enrollmentId}>
                    <h3 className="text-base font-semibold text-(--color-ink)">{c.courseTitle}</h3>
                    <p className="mt-1 text-sm text-(--color-slate)">
                      {c.completed} of {c.total} lessons done
                    </p>
                    <div className="mt-3">
                      <ProgressBar pct={c.completionPct} />
                    </div>
                    <Link to="/student/lms/courses" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-(--color-accent) hover:underline">
                      Keep learning
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
