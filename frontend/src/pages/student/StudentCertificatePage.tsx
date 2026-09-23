import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";
import { useAuth } from "../../lib/AuthProvider";
import { CertificateIcon, CoursesIcon } from "../../components/landing/icons";
import type { ApiCertificate } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";

const COURSE_TITLE = "Intro to Design";

export function StudentCertificatePage() {
  const { id } = useParams();
  const { profile, authSource } = useAuth();
  const [issued, setIssued] = useState<ApiCertificate | null>(null);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase) return;

    // issue_certificate is idempotent (insert ... on conflict do nothing,
    // falls back to a select) — see supabase/migrations/0003_functions.sql.
    supabase.rpc("issue_certificate", { p_course_title: COURSE_TITLE }).then(({ data, error }) => {
      if (error || !data) return;
      const row = data as { id: string; user_id: string; course_title: string; serial: string; issued_at: string };
      setIssued({
        id: row.id,
        userName: profile?.fullName ?? "",
        courseTitle: row.course_title,
        serial: row.serial,
        issuedAt: new Date(row.issued_at).getTime() / 1000,
      });
    });
  }, [authSource, profile?.fullName]);

  const completedOn = issued
    ? new Date(issued.issuedAt * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const serial =
    issued?.serial ??
    `HBL-${id ?? "1"}-${(profile?.id ?? "0000").toString().padStart(4, "0").slice(-4)}`;

  return (
    <>
      <Seo
        title="Certificate"
        description="Course completion certificate."
        path={`/student/courses/${id}/certificate`}
      />

      <div className="flex items-center justify-between print:hidden">
        <Link
          to={`/student/courses/${id}/lessons/l1`}
          className="flex items-center gap-1.5 text-sm text-(--color-mist) hover:text-(--color-ink)"
        >
          <CoursesIcon />
          Back to course
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
        >
          Print / Save as PDF
        </button>
      </div>

      <Reveal delay={0.05} className="mt-8 flex justify-center">
        <div className="w-full max-w-2xl rounded-2xl border-2 border-(--color-violet) bg-(--color-paper) p-10 text-center shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] print:border print:shadow-none">
          <div className="flex justify-center text-(--color-violet)">
            <CertificateIcon />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-(--color-mist)">
            Certificate of Completion
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-(--color-ink)">
            {profile?.fullName ?? "Student"}
          </h1>
          <p className="mt-3 text-[15px] text-(--color-slate)">
            has successfully completed
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-(--color-ink)">
            {COURSE_TITLE}
          </p>
          <div className="mx-auto mt-6 h-px w-24 bg-(--color-line)" />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-sm text-(--color-mist)">
            <span>Completed {completedOn}</span>
            <span>Serial {serial}</span>
          </div>
        </div>
      </Reveal>

      <p className="mt-6 text-center text-sm text-(--color-mist) print:hidden">
        {issued ? (
          <>
            Verified record — anyone can confirm it at{" "}
            <Link
              to={`/verify/${issued.id}`}
              className="font-medium text-(--color-violet) hover:text-(--color-violet-deep)"
            >
              hanbeelms.com/verify/{issued.id}
            </Link>
            , no account needed.
          </>
        ) : (
          "This certificate is generated from HanbeeLms course-progress records."
        )}
      </p>
    </>
  );
}