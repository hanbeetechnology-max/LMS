import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../ui/Reveal";
import { CountUp } from "../ui/CountUp";
import { ClockIcon } from "../landing/icons";
import { useToast } from "../../lib/ToastProvider";
import { weeklyHoursTotal, onTimeRate } from "../../lib/mockStaffTimeTracking";

type BreakType = "lunch" | "break";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function TimeClockWidget() {
  const { showToast } = useToast();
  const [clockedInAt, setClockedInAt] = useState<number | null>(null);
  const [onBreak, setOnBreak] = useState<BreakType | null>(null);
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!clockedInAt) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [clockedInAt]);

  function clockIn() {
    const at = Date.now();
    setClockedInAt(at);
    setNow(at);
    showToast(`Clocked in at ${formatTime(at)}.`);
  }

  function clockOut() {
    if (!clockedInAt) return;
    const worked = formatElapsed(Date.now() - clockedInAt);
    setClockedInAt(null);
    setOnBreak(null);
    setBreakStartedAt(null);
    showToast(`Clocked out — worked ${worked} today.`);
  }

  function startBreak(type: BreakType) {
    setOnBreak(type);
    setBreakStartedAt(Date.now());
    showToast(`${type === "lunch" ? "Lunch" : "Break"} started at ${formatTime(Date.now())}.`);
  }

  function endBreak() {
    setOnBreak(null);
    setBreakStartedAt(null);
    showToast(`${onBreak === "lunch" ? "Lunch" : "Break"} ended.`);
  }

  return (
    <Reveal delay={0.08} className="mt-6 rounded-2xl border border-(--color-line) p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-violet-soft) text-(--color-violet)">
            <ClockIcon />
          </span>
          <div>
            {clockedInAt ? (
              onBreak ? (
                <>
                  <p className="text-sm font-medium text-(--color-ink)">
                    On {onBreak === "lunch" ? "lunch" : "a break"} since {breakStartedAt && formatTime(breakStartedAt)}
                  </p>
                  <p className="text-xs text-(--color-mist)">Clocked in at {formatTime(clockedInAt)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-(--color-ink)">Clocked in at {formatTime(clockedInAt)}</p>
                  <p className="text-xs text-(--color-mist)">{formatElapsed(now - clockedInAt)} today</p>
                </>
              )
            ) : (
              <>
                <p className="text-sm font-medium text-(--color-ink)">Not clocked in</p>
                <p className="text-xs text-(--color-mist)">Clock in to start tracking today's hours</p>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!clockedInAt && (
            <button
              type="button"
              onClick={clockIn}
              className="rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
            >
              Clock in
            </button>
          )}
          {clockedInAt && !onBreak && (
            <>
              <button
                type="button"
                onClick={() => startBreak("lunch")}
                className="rounded-full border border-(--color-line) px-4 py-2.5 text-sm font-medium text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink)"
              >
                Start lunch
              </button>
              <button
                type="button"
                onClick={() => startBreak("break")}
                className="rounded-full border border-(--color-line) px-4 py-2.5 text-sm font-medium text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink)"
              >
                Start break
              </button>
              <button
                type="button"
                onClick={clockOut}
                className="rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
              >
                Clock out
              </button>
            </>
          )}
          {clockedInAt && onBreak && (
            <button
              type="button"
              onClick={endBreak}
              className="rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
            >
              End {onBreak === "lunch" ? "lunch" : "break"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-6 border-t border-(--color-line) pt-5">
        <div className="flex gap-6">
          <div>
            <dd className="font-display text-2xl font-semibold text-(--color-ink)">
              <CountUp value={`${weeklyHoursTotal().toFixed(1)}h`} delay={0.1} />
            </dd>
            <p className="mt-0.5 text-xs text-(--color-mist)">this week</p>
          </div>
          <div>
            <dd className="font-display text-2xl font-semibold text-(--color-ink)">
              <CountUp value={`${onTimeRate()}%`} delay={0.15} />
            </dd>
            <p className="mt-0.5 text-xs text-(--color-mist)">on-time rate</p>
          </div>
        </div>
        <Link to="/staff/performance" className="shrink-0 text-xs font-medium text-(--color-slate) hover:text-(--color-ink)">
          View full performance →
        </Link>
      </div>
    </Reveal>
  );
}
