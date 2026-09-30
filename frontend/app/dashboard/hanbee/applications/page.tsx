"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input, Select } from "../../../../components/ui/FormField";
import Shimmer from "../../../../components/ui/Shimmer";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";
import { authenticatedSupabaseFetch } from "../../../../lib/supabaseAuth";

type Application = { id: string; course_id: string; course_title: string; applicant_id: string; applicant_name: string; school_name: string | null; status: string; payment_declared: boolean; created_at: string };
type Section = { id: string; course_id: string; name: string };

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const rpc = <T,>(name: string, args: Record<string, unknown> = {}) =>
  authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

export default function HanbeeApplicationsPage() {
  const { data: profile } = useSessionProfile();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [selectedSections, setSelectedSections] = useState<Record<string, string>>({});
  const canView = profile?.role === "manager" || profile?.role === "staff";
  const queryClient = useQueryClient();

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ["course-applications", debouncedSearch],
    queryFn: () => rpc<Application[]>("list_course_applications", { p_status: ["applied", "payment_declared"], p_search: debouncedSearch || null }),
    enabled: canView,
    placeholderData: (previous) => previous,
  });
  const { data: sections } = useQuery({
    queryKey: ["course-sections"],
    queryFn: () => authenticatedSupabaseFetch<Section[]>("/rest/v1/sections?select=id,course_id,name&order=name.asc"),
    enabled: canView,
  });

  const decide = useMutation({
    mutationFn: ({ application, decision }: { application: Application; decision: "verified" | "rejected" }) => {
      const sectionId = selectedSections[application.id];
      return rpc("decide_course_application", { p_application: application.id, p_decision: decision, p_section: decision === "verified" ? sectionId : null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-applications"] }),
  });

  const list = applications ?? [];
  const sectionList = sections ?? [];

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Course Applications</h1><p className={styles.pageSubtitle}>Review course requests and enroll students into a section</p></div>
      {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load course applications."}</p>}
      {decide.isError && <p role="alert">{decide.error instanceof Error ? decide.error.message : "We couldn't decide this application."}</p>}

      <div style={{ position: "relative", maxWidth: 320, marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student or course…" aria-label="Search applications" style={{ paddingLeft: 36 }} />
      </div>

      {isLoading ? <Shimmer rows={3} /> : <div className={styles.sectionCard}>
        {list.map((application) => {
          const choices = sectionList.filter((section) => section.course_id === application.course_id);
          const busy = decide.isPending && decide.variables?.application.id === application.id;
          return <article key={application.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <h2>{application.applicant_name} · {application.course_title}</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 5 }}>{application.school_name ?? "Independent student"} · {application.status.replaceAll("_", " ")} · Submitted {new Date(application.created_at).toLocaleDateString()}</p>
            {application.payment_declared && <p style={{ marginTop: 5 }}>Student has declared payment.</p>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "flex-end" }}>
              <label>Enrollment section <Select value={selectedSections[application.id] ?? ""} onChange={(event) => setSelectedSections((current) => ({ ...current, [application.id]: event.target.value }))}>
                <option value="">Choose a section</option>{choices.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </Select></label>
              <button type="button" className={styles.actionBtn} disabled={decide.isPending || choices.length === 0} onClick={() => decide.mutate({ application, decision: "verified" })}>{busy ? "Saving…" : "Approve and enroll"}</button>
              <button type="button" className={styles.actionBtn} disabled={decide.isPending} onClick={() => decide.mutate({ application, decision: "rejected" })}>Decline</button>
            </div>
            {choices.length === 0 && <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Create a course section before approving this request.</p>}
          </article>;
        })}
        {list.length === 0 && <p>{search ? "No applications match your search." : "No course applications are waiting for review."}</p>}
      </div>}
    </div>
  );
}
