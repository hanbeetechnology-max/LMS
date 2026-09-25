import { useState } from "react";
import { useToast } from "../../lib/ToastProvider";
import { clockIn, clockOut, fetchMyTimeHistory } from "../../lib/staffTimeApi";
import { Card, ErrorBlock, LoadingBlock, PageHeader, formatTime, useAsync } from "../kit";
import { AttendanceView } from "./AttendanceView";
import { btn, REFUSED } from "./ui";

function TodayCard() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(() => fetchMyTimeHistory(2), []);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const entry = (data ?? []).find((e) => e.workDate === today) ?? null;
  const clockedIn = !!entry && !entry.clockOut;

  async function toggle() {
    setBusy(true);
    const ok = clockedIn ? await clockOut() : await clockIn();
    showToast(ok ? (clockedIn ? "Clocked out. Have a good rest of your day." : "Clocked in. The server recorded your start time.") : REFUSED, ok ? "success" : "error");
    setBusy(false);
    reload();
  }

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock onRetry={reload} />;
  return (
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-(--color-mist)">Today</p>
        <p className="mt-1 text-base font-semibold text-(--color-ink)">
          {!entry ? "Not clocked in" : clockedIn ? `Clocked in at ${formatTime(entry.clockIn)}` : `Clocked out at ${formatTime(entry.clockOut)}`}
        </p>
      </div>
      {entry && !clockedIn ? null : (
        <button type="button" onClick={toggle} disabled={busy} className={clockedIn ? btn.secondary : btn.primary}>
          {busy ? "Working..." : clockedIn ? "Clock out" : "Clock in"}
        </button>
      )}
    </Card>
  );
}

export function AttendancePage() {
  return (
    <>
      <PageHeader title="Attendance" subtitle="Your own days, hours and lateness." />
      <TodayCard />
      <AttendanceView staffId={null} />
    </>
  );
}
