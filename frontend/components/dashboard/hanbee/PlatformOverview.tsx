"use client";

import { useEffect, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../lib/supabaseAuth";

type OverviewData = Record<string, unknown>;
const sectionLabels: Record<string, string> = { site_lms_overview: "Learning platform", site_tournament_overview: "Tournament platform" };

export default function PlatformOverview({ functions, title }: { functions: string[]; title: string }) {
  const functionKey = functions.join(",");
  const [data, setData] = useState<Record<string, OverviewData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const profile = await getAccountProfile();
      if (profile.role !== "staff" && profile.role !== "manager") throw new Error("This overview is for approved Hanbee staff.");
      const results = await Promise.all(functionKey.split(",").map(async (name) => [name, await authenticatedSupabaseFetch<OverviewData>(`/rest/v1/rpc/${name}`, { method: "POST", body: "{}" })] as const));
      if (active) setData(Object.fromEntries(results));
    }
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the platform overview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [functionKey]);

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>{title}</h1><p className={styles.pageSubtitle}>Live totals from the Hanbee Supabase database</p></div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading overview…</p> : Object.entries(data).map(([section, values]) => (
        <section key={section} className={styles.sectionCard} style={{ marginBottom: 24 }}>
          <h2 className={styles.sectionTitle}>{sectionLabels[section] ?? section}</h2>
          <div className={styles.metricsRow} style={{ marginTop: 18 }}>
            {Object.entries(values).map(([key, value]) => typeof value === "object" && value !== null
              ? Object.entries(value as Record<string, unknown>).map(([subKey, subValue]) => <Metric key={`${key}-${subKey}`} label={`${key.replaceAll("_", " ")} · ${subKey.replaceAll("_", " ")}`} value={String(subValue)} />)
              : <Metric key={key} label={key.replaceAll("_", " ")} value={String(value)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metricCard}><span className={styles.metricLabel}>{label}</span><div className={styles.metricValue} style={{ fontSize: 20 }}>{value}</div></div>;
}
