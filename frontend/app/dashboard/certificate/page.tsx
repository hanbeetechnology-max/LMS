"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import { fetchMyCertificates, type StudentCertificate } from "../../../lib/certificatesApi";

export default function CertificatePage() {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyCertificates()
      .then((rows) => { if (active) setCertificates(rows); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load your certificates."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>My Certificates</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Certificates issued for courses completed on Hanbee.</p>
      {error && <p role="alert" style={{ marginTop: 20 }}>{error}</p>}
      {loading && <p role="status" style={{ marginTop: 20 }}>Loading your certificates…</p>}
      {!loading && !error && certificates.length === 0 && (
        <section style={{ marginTop: 24, padding: 24, borderRadius: 16, background: "var(--bg-card)" }}>
          <Award size={22} aria-hidden="true" />
          <h2 style={{ marginTop: 12, fontSize: 18 }}>No certificates yet</h2>
          <p style={{ marginTop: 6, color: "var(--text-muted)" }}>Complete an enrolled course to earn a certificate.</p>
          <Link href="/dashboard/courses" style={{ display: "inline-block", marginTop: 14, color: "var(--text-main)" }}>View my courses</Link>
        </section>
      )}
      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {certificates.map((certificate) => (
          <article key={certificate.id} style={{ padding: 24, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Award size={22} aria-hidden="true" /><h2 style={{ fontSize: 18, fontWeight: 600 }}>{certificate.course_title}</h2></div>
            <p style={{ marginTop: 12, color: "var(--text-muted)" }}>Certificate serial: <strong>{certificate.serial}</strong></p>
            <p style={{ marginTop: 4, color: "var(--text-muted)" }}>Issued {new Date(certificate.issued_at).toLocaleDateString()}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
