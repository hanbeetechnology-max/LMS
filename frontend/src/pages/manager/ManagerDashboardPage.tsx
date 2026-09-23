import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { useAuth } from "../../lib/AuthProvider";
import { EnrollmentIcon, SchedulingIcon, AttendanceIcon } from "../../components/landing/icons";
import { supabase } from "../../lib/supabaseClient";
import { INITIAL_APPLICANTS } from "../../lib/mockVerifications";

const MOCK_PENDING_APPLICANTS = INITIAL_APPLICANTS.filter((a) => a.status === "pending").length;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function ManagerDashboardPage() {
  const { profile, authSource } = useAuth();
  const firstName = profile?.fullName.split(" ")[0];
  // The rest of these stats are mock (no backend model for courses/students/
  // verifications yet) — this one is real, computed from actual live
  // sessions, since that data genuinely exists (see docs/PLAN.md §10.35/§10.40).
  const [staffActiveNow, setStaffActiveNow] = useState<number | null>(null);
  // Real, not mock: a self-service staff signup can't reach anything until a
  // manager approves them (docs/PLAN.md §10.42) — this is what's actually
  // sitting in their queue right now, not a placeholder count.
  const [pendingStaffCount, setPendingStaffCount] = useState<number | null>(null);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase) return;
    supabase
      .from("auto_attendance_sessions_effective")
      .select("effective_status, profiles(role)")
      .eq("effective_status", "active")
      .then(({ data, error }) => {
        if (error || !data) return;
        setStaffActiveNow(data.filter((row) => (row.profiles as unknown as { role: string } | null)?.role === "staff").length);
      });

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "staff")
      .eq("approved", false)
      .then(({ count, error }) => {
        if (error || count === null) return;
        setPendingStaffCount(count);
      });
  }, [authSource]);

  const pendingVerifications = pendingStaffCount === null ? MOCK_PENDING_APPLICANTS : MOCK_PENDING_APPLICANTS + pendingStaffCount;

  const stats = [
    ["4", "active courses"],
    ["96", "total students"],
    [String(pendingVerifications), "pending verifications"],
    [staffActiveNow === null ? "—" : String(staffActiveNow), "staff clocked in now"],
  ] as const;

  return (
    <>
      <Seo title="Manager Dashboard" description="Org-wide oversight for HanbeeLms." path="/manager/dashboard" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Here's how the center is doing today.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-8 grid grid-cols-2 gap-6 border-b border-(--color-line) pb-8 sm:grid-cols-4">
        {stats.map(([value, label], i) => (
          <div key={label}>
            <dd className="font-display text-3xl font-semibold text-(--color-ink)">
              <CountUp value={value} delay={0.15 + i * 0.08} />
            </dd>
            <p className="mt-1 text-sm text-(--color-mist)">{label}</p>
          </div>
        ))}
      </Reveal>

      <StaggerGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StaggerItem className="rounded-2xl border border-(--color-line) p-6">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-violet-soft) text-(--color-violet)">
              <EnrollmentIcon />
            </span>
            {!!pendingStaffCount && (
              <span className="rounded-full bg-(--color-amber-soft) px-2.5 py-0.5 text-xs font-semibold text-(--color-amber-deep)">
                {pendingStaffCount} staff pending
              </span>
            )}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Verifications</h3>
          <p className="mt-1 text-sm text-(--color-slate)">Review and enroll new applicants.</p>
          <Link to="/manager/verifications" className="mt-4 inline-block text-sm font-medium text-(--color-violet) hover:text-(--color-violet-deep)">
            Open verifications →
          </Link>
        </StaggerItem>
        <StaggerItem className="rounded-2xl border border-(--color-line) p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-amber-soft) text-(--color-amber-deep)">
            <SchedulingIcon />
          </span>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Holidays</h3>
          <p className="mt-1 text-sm text-(--color-slate)">Manage the center-wide holiday calendar.</p>
          <Link to="/manager/holidays" className="mt-4 inline-block text-sm font-medium text-(--color-violet) hover:text-(--color-violet-deep)">
            Open holidays →
          </Link>
        </StaggerItem>
        <StaggerItem className="rounded-2xl border border-(--color-line) p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-teal-soft) text-(--color-teal-deep)">
            <AttendanceIcon />
          </span>
          <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">Staff</h3>
          <p className="mt-1 text-sm text-(--color-slate)">Time logs and performance across every staff member.</p>
          <Link to="/manager/staff" className="mt-4 inline-block text-sm font-medium text-(--color-violet) hover:text-(--color-violet-deep)">
            Open staff rollup →
          </Link>
        </StaggerItem>
      </StaggerGroup>
    </>
  );
}
