import { useMemo, useState } from "react";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { AttendanceIcon } from "../../components/landing/icons";
import { useToast } from "../../lib/ToastProvider";
import { SECTIONS as ROSTER_SECTIONS, INITIAL_ROSTER } from "../../lib/mockStaffRoster";
import { AutoAttendancePanel } from "../../components/app/AutoAttendancePanel";

type Status = "present" | "absent" | "late" | "excused";

const STATUS_LABEL: Record<Status, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

// Present/Late use fixed-dark text: teal/amber are bright accent fills in
// both themes (they don't swap role the way ink/paper do), so pairing them
// with the theme-swapping --color-ink would go near-white-on-bright in dark
// mode — a real contrast failure this fixes (see docs/PLAN.md's dark-mode
// audit round).
const STATUS_STYLES: Record<Status, string> = {
  present: "bg-(--color-teal) text-(--color-ink-fixed)",
  absent: "bg-(--color-error) text-(--color-paper)",
  late: "bg-(--color-amber) text-(--color-ink-fixed)",
  excused: "bg-(--color-ink-soft) text-(--color-paper)",
};

const SESSIONS_BY_SECTION: Record<string, string[]> = {
  "Intro to Design — Section B": ["Today, 10:00 AM", "Fri, Sep 12 · 10:00 AM", "Wed, Sep 3 · 10:00 AM"],
  "Data Structures": ["Tomorrow, 1:00 PM", "Mon, Sep 8 · 1:00 PM"],
};

// Roster is the single source of truth for who's enrolled — only active/
// completed students are markable, so an invited-but-not-yet-accepted
// student can't show up "Present" on a session grid they haven't joined.
const SECTIONS: Record<string, { students: { id: string; name: string }[]; sessions: string[] }> = Object.fromEntries(
  ROSTER_SECTIONS.map((name) => [
    name,
    {
      students: INITIAL_ROSTER[name]
        .filter((s) => s.status === "active" || s.status === "completed")
        .map((s) => ({ id: s.id, name: s.name })),
      sessions: SESSIONS_BY_SECTION[name] ?? ["Today"],
    },
  ]),
);

const SECTION_NAMES = Object.keys(SECTIONS);
const NOTE_STATUSES: Status[] = ["absent", "excused"];

export function StaffAttendancePage() {
  const { showToast } = useToast();
  const [sectionName, setSectionName] = useState(SECTION_NAMES[0]);
  const [session, setSession] = useState(SECTIONS[SECTION_NAMES[0]].sessions[0]);
  const [marksBySection, setMarksBySection] = useState<Record<string, Record<string, Status>>>({});
  const [notesBySection, setNotesBySection] = useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = useState(false);

  const section = SECTIONS[sectionName];
  const marks =
    marksBySection[sectionName] ?? Object.fromEntries(section.students.map((s) => [s.id, "present" as Status]));
  const notes = notesBySection[sectionName] ?? {};

  const savedCount = useMemo(() => Object.keys(marks).length, [marks]);

  function setMark(id: string, status: Status) {
    setSaved(false);
    setMarksBySection((prev) => ({ ...prev, [sectionName]: { ...marks, [id]: status } }));
  }

  function setNote(id: string, note: string) {
    setNotesBySection((prev) => ({ ...prev, [sectionName]: { ...notes, [id]: note } }));
  }

  function markAllPresent() {
    setSaved(false);
    setMarksBySection((prev) => ({
      ...prev,
      [sectionName]: Object.fromEntries(section.students.map((s) => [s.id, "present" as Status])),
    }));
  }

  function changeSection(next: string) {
    setSectionName(next);
    setSession(SECTIONS[next].sessions[0]);
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    showToast(`Attendance saved for ${sectionName}.`);
  }

  return (
    <>
      <Seo title="Attendance" description="Mark attendance for your class sessions." path="/staff/attendance" />

      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Attendance</h2>
          <p className="mt-1 text-[15px] text-(--color-slate)">Mark who attended a session.</p>
        </div>
        <button
          type="button"
          onClick={markAllPresent}
          className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink)"
        >
          Mark all present
        </button>
      </Reveal>

      <Reveal delay={0.05} className="mt-6 flex flex-wrap gap-3">
        <select
          value={sectionName}
          onChange={(e) => changeSection(e.target.value)}
          className="rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-2 text-sm font-medium text-(--color-ink-soft) outline-none transition-colors focus:border-(--color-violet)"
        >
          {SECTION_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={session}
          onChange={(e) => {
            setSession(e.target.value);
            setSaved(false);
          }}
          className="rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-2 text-sm font-medium text-(--color-ink-soft) outline-none transition-colors focus:border-(--color-violet)"
        >
          {section.sessions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Reveal>

      <StaggerGroup key={sectionName} className="mt-6 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
        {section.students.map((student) => {
          const status = marks[student.id];
          const showNote = NOTE_STATUSES.includes(status);
          return (
            <StaggerItem key={student.id} y={12} className="flex flex-col gap-2 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-(--color-ink)">{student.name}</span>
                <div className="flex gap-2">
                  {(Object.keys(STATUS_LABEL) as Status[]).map((s) => {
                    const active = status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMark(student.id, s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                          active ? STATUS_STYLES[s] : "bg-(--color-cloud) text-(--color-slate) hover:bg-(--color-line)"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {showNote && (
                <input
                  value={notes[student.id] ?? ""}
                  onChange={(e) => setNote(student.id, e.target.value)}
                  placeholder={`Reason (optional) — why ${student.name.split(" ")[0]} was ${STATUS_LABEL[status].toLowerCase()}`}
                  className="w-full rounded-lg border border-(--color-line) bg-(--color-cloud) px-3 py-1.5 text-xs text-(--color-ink) outline-none transition-colors focus:border-(--color-violet)"
                />
              )}
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      <Reveal delay={0.1} className="sticky bottom-6 mt-6 flex items-center justify-between rounded-2xl border border-(--color-line) bg-(--color-paper) px-5 py-4 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 text-sm text-(--color-slate)">
          <AttendanceIcon />
          {saved ? "Attendance saved." : `${savedCount} students · not yet saved`}
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
        >
          Save attendance
        </button>
      </Reveal>

      <div className="mt-10">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">System attendance</h3>
        <p className="mt-1 text-sm text-(--color-mist)">
          Real sign-ins, auto-tracked by session activity — separate from the manual roster above, since only accounts with a
          real login (not the mock roster) show up here.
        </p>
        <div className="mt-4">
          <AutoAttendancePanel scope="all" />
        </div>
      </div>
    </>
  );
}
