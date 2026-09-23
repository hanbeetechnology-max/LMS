import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../lib/Seo";
import { Reveal } from "../components/ui/Reveal";
import { Logo } from "../components/landing/Logo";
import { CertificateIcon } from "../components/landing/icons";
import type { ApiCertificate } from "../lib/api";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

type Status = "loading" | "found" | "not-found";

/** Deliberately public and account-free — a certificate exists so a third
 * party (an employer, another school) can confirm it holds up without
 * needing to sign in or trust a screenshot. */
export function VerifyCertificatePage() {
  const { certificateId } = useParams();
  const [status, setStatus] = useState<Status>("loading");
  const [cert, setCert] = useState<ApiCertificate | null>(null);

  useEffect(() => {
    if (!certificateId) {
      setStatus("not-found");
      return;
    }
    // Deliberately unauthenticated — this page needs to work for a visitor
    // with no HanbeeLms session at all, so it never routes through
    // useAuth(). See supabase/migrations/0003_functions.sql's
    // verify_certificate() RPC, granted to the `anon` role for exactly this.
    if (!supabaseConfigured || !supabase) {
      setStatus("not-found");
      return;
    }
    supabase
      .rpc("verify_certificate", { p_certificate_id: certificateId })
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus("not-found");
          return;
        }
        const row = data as { id: string; user_name: string; course_title: string; issued_at: string; serial: string };
        setCert({ id: row.id, userName: row.user_name, courseTitle: row.course_title, serial: row.serial, issuedAt: new Date(row.issued_at).getTime() / 1000 });
        setStatus("found");
      });
  }, [certificateId]);

  return (
    <>
      <Seo title="Verify a certificate" description="Verify a HanbeeLms course-completion certificate." path={`/verify/${certificateId ?? ""}`} />

      <div className="mx-auto max-w-2xl px-6 py-16 lg:px-0">
        <Link to="/" aria-label="HanbeeLms home">
          <Logo />
        </Link>

        <Reveal delay={0.05} className="mt-10">
          {status === "loading" && <p className="text-sm text-(--color-mist)">Checking…</p>}

          {status === "not-found" && (
            <div className="rounded-2xl border border-(--color-error)/30 bg-(--color-error-soft) p-6">
              <h1 className="font-display text-xl font-semibold text-(--color-ink)">Certificate not found</h1>
              <p className="mt-2 text-sm text-(--color-ink-soft)">
                This link doesn't match a certificate on record. Serials are case-sensitive and only exist once actually issued.
              </p>
            </div>
          )}

          {status === "found" && cert && (
            <div className="rounded-2xl border-2 border-(--color-teal) bg-(--color-paper) p-8 text-center">
              <div className="flex justify-center text-(--color-teal)">
                <CertificateIcon />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-(--color-teal-deep)">Verified</p>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-(--color-ink)">{cert.userName}</h1>
              <p className="mt-2 text-[15px] text-(--color-slate)">completed</p>
              <p className="mt-1 font-display text-lg font-semibold text-(--color-ink)">{cert.courseTitle}</p>
              <p className="mt-4 text-sm text-(--color-mist)">
                {new Date(cert.issuedAt * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · Serial{" "}
                {cert.serial}
              </p>
            </div>
          )}
        </Reveal>
      </div>
    </>
  );
}
