import { useEffect, useState } from "react";
import { useToast } from "../../lib/ToastProvider";
import { fetchWorkSettings, updateWorkSettings } from "../../lib/staffAttendanceApi";
import { Card, ErrorBlock, LoadingBlock, useAsync } from "../kit";
import { btn, inputClass, Field } from "../hanbee/ui";

const DAYS = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [7, "Sun"],
] as const;

export function WorkingHoursCard() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsync(fetchWorkSettings, []);
  const [start, setStart] = useState("09:00");
  const [grace, setGrace] = useState("15");
  const [days, setDays] = useState<number[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setStart(data.startTime);
    setGrace(String(data.graceMinutes));
    setDays(data.workDays);
  }, [data]);

  async function save() {
    const g = Number(grace);
    if (!start) return setProblem("Enter a start time.");
    if (grace.trim() === "" || !Number.isInteger(g) || g < 0 || g > 240) return setProblem("Grace minutes must be a whole number from 0 to 240.");
    if (days.length === 0) return setProblem("Pick at least one working day.");
    setProblem(null);
    setBusy(true);
    const res = await updateWorkSettings({ startTime: start, graceMinutes: g, workDays: [...days].sort() });
    setBusy(false);
    if (res.ok) {
      showToast("Working hours saved. They apply to future clock-ins.");
      reload();
    } else setProblem(res.error ?? "Could not save.");
  }

  return (
    <Card className="mb-6">
      <h2 className="text-base font-semibold text-(--color-ink)">Working hours</h2>
      <p className="mt-1 text-sm text-(--color-slate)">These rules decide who is late or absent. Changes apply to future clock-ins.</p>
      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorBlock onRetry={reload} />
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="w-36"><Field label="Start time">{(id) => <input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />}</Field></div>
          <div className="w-36"><Field label="Grace minutes">{(id) => <input id={id} inputMode="numeric" value={grace} onChange={(e) => setGrace(e.target.value)} className={inputClass} />}</Field></div>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-(--color-slate)">Working days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(([n, name]) => (
                <label key={n} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-(--color-line) px-3 text-sm text-(--color-ink)">
                  <input type="checkbox" checked={days.includes(n)} onChange={(e) => setDays((d) => (e.target.checked ? [...d, n] : d.filter((x) => x !== n)))} />
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? "Saving..." : "Save"}</button>
          {problem && <p role="alert" className="w-full text-sm text-(--color-error)">{problem}</p>}
        </div>
      )}
    </Card>
  );
}
