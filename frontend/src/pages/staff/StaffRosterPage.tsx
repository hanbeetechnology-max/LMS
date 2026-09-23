import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { EnrollmentIcon } from "../../components/landing/icons";
import { useToast } from "../../lib/ToastProvider";
import { useDismissOnEscape } from "../../lib/useDismissOnEscape";
import { attendanceRate, completionRate } from "../../lib/mockStudentRecords";
import { downloadCsv } from "../../lib/csv";
import { INITIAL_SECTIONS, type SectionMeta } from "../../lib/mockSections";
import { INITIAL_ROSTER, type Status, type Student } from "../../lib/mockStaffRoster";

const SECTION_LESSON_COUNTS: Record<string, number> = {
  "Intro to Design — Section B": 5,
  "Data Structures": 0,
};

function RowMenu({
  student,
  onResend,
  onRemove,
  onReactivate,
}: {
  student: Student;
  onResend: () => void;
  onRemove: () => void;
  onReactivate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDismissOnEscape(open, () => setOpen(false), triggerRef);

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Actions for ${student.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 w-11 items-center justify-center rounded-lg text-(--color-mist) hover:bg-(--color-cloud) hover:text-(--color-ink)"
      >
        ⋯
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-44 overflow-hidden rounded-xl border border-(--color-line) bg-(--color-paper) py-1 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)]"
          >
            {student.status === "invited" && (
              <button
                type="button"
                onClick={() => {
                  onResend();
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-(--color-ink-soft) hover:bg-(--color-cloud)"
              >
                Resend invite
              </button>
            )}
            {student.status === "dropped" && (
              <button
                type="button"
                onClick={() => {
                  onReactivate();
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-(--color-ink-soft) hover:bg-(--color-cloud)"
              >
                Reactivate
              </button>
            )}
            {student.status !== "dropped" && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-(--color-error) hover:bg-(--color-error-soft)"
              >
                Remove from section
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SectionsPanel({
  sections,
  rosterCounts,
  onUpdate,
  onAdd,
  onDelete,
}: {
  sections: SectionMeta[];
  rosterCounts: Record<string, number>;
  onUpdate: (name: string, patch: Partial<SectionMeta>) => void;
  onAdd: (section: SectionMeta) => boolean;
  onDelete: (name: string) => void;
}) {
  const { showToast } = useToast();
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState(30);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  function handleAdd() {
    if (!newName.trim()) return;
    const added = onAdd({ name: newName.trim(), capacity: newCapacity, startDate: newStart, endDate: newEnd });
    if (!added) {
      showToast(`A section named "${newName.trim()}" already exists.`);
      return;
    }
    showToast(`Section "${newName.trim()}" created.`);
    setNewName("");
    setNewCapacity(30);
    setNewStart("");
    setNewEnd("");
  }

  return (
    <div className="mt-4 rounded-2xl border border-(--color-line) p-5">
      <h3 className="font-display text-sm font-semibold text-(--color-ink)">Manage sections</h3>
      <div className="mt-4 flex flex-col gap-4">
        {sections.map((sec) => {
          const enrolled = rosterCounts[sec.name] ?? 0;
          return (
            <div
              key={sec.name}
              data-testid={`section-row-${sec.name}`}
              className="flex flex-wrap items-end gap-3 border-b border-(--color-line) pb-4 last:border-0 last:pb-0"
            >
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-medium text-(--color-ink)">{sec.name}</p>
                <p className="text-xs text-(--color-mist)">{enrolled} enrolled</p>
              </div>
              <label className="flex flex-col gap-1 text-xs text-(--color-mist)">
                Capacity
                <input
                  type="number"
                  min={enrolled}
                  value={sec.capacity}
                  onChange={(e) => onUpdate(sec.name, { capacity: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-(--color-line) bg-(--color-paper) px-2 py-1 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-(--color-mist)">
                Start date
                <input
                  type="date"
                  value={sec.startDate}
                  onChange={(e) => onUpdate(sec.name, { startDate: e.target.value })}
                  className="rounded-lg border border-(--color-line) bg-(--color-paper) px-2 py-1 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-(--color-mist)">
                End date
                <input
                  type="date"
                  value={sec.endDate}
                  onChange={(e) => onUpdate(sec.name, { endDate: e.target.value })}
                  className="rounded-lg border border-(--color-line) bg-(--color-paper) px-2 py-1 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
                />
              </label>
              <button
                type="button"
                onClick={() => onDelete(sec.name)}
                disabled={enrolled > 0}
                title={enrolled > 0 ? "Remove all students before deleting a section" : undefined}
                className="rounded-full border border-(--color-line) px-3 py-1.5 text-xs font-medium text-(--color-error) transition-colors hover:border-(--color-error) disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-(--color-line) pt-4">
        <label className="flex flex-1 min-w-[180px] flex-col gap-1 text-xs text-(--color-mist)">
          New section name
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Data Structures — Evening"
            className="rounded-lg border border-(--color-line) bg-(--color-paper) px-2 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-(--color-mist)">
          Capacity
          <input
            type="number"
            min={1}
            value={newCapacity}
            onChange={(e) => setNewCapacity(Number(e.target.value))}
            className="w-20 rounded-lg border border-(--color-line) bg-(--color-paper) px-2 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-(--color-mist)">
          Start date
          <input
            type="date"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="rounded-lg border border-(--color-line) bg-(--color-paper) px-2 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-(--color-mist)">
          End date
          <input
            type="date"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="rounded-lg border border-(--color-line) bg-(--color-paper) px-2 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-violet)"
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="rounded-full bg-(--color-ink) px-4 py-1.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
        >
          Add section
        </button>
      </div>
    </div>
  );
}

export function StaffRosterPage() {
  const { showToast } = useToast();
  const [roster, setRoster] = useState(INITIAL_ROSTER);
  const [sectionMeta, setSectionMeta] = useState<SectionMeta[]>(INITIAL_SECTIONS);
  const sectionNames = useMemo(() => sectionMeta.map((s) => s.name), [sectionMeta]);
  const [section, setSection] = useState(sectionNames[0]);
  const [showSections, setShowSections] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const isSearching = query.trim().length > 0;

  const students = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (isSearching) {
      return sectionNames.flatMap((sec) =>
        (roster[sec] ?? [])
          .filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
          .map((s) => ({ ...s, section: sec })),
      );
    }
    return (roster[section] ?? []).map((s) => ({ ...s, section }));
  }, [roster, query, isSearching, section, sectionNames]);

  const allSelected = selected.size > 0 && selected.size === students.length;

  const selectedNames = useMemo(
    () => students.filter((s) => selected.has(s.id)).map((s) => s.name),
    [students, selected],
  );

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(students.map((s) => s.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setStatus(id: string, status: Status) {
    setRoster((prev) => {
      const next = { ...prev };
      for (const sec of Object.keys(prev)) next[sec] = prev[sec].map((s) => (s.id === id ? { ...s, status } : s));
      return next;
    });
  }

  function removeSelected() {
    const count = selected.size;
    setRoster((prev) => {
      const next = { ...prev };
      for (const sec of Object.keys(prev)) {
        next[sec] = prev[sec].map((s) => (selected.has(s.id) ? { ...s, status: "dropped" as Status } : s));
      }
      return next;
    });
    setSelected(new Set());
    showToast(`Removed ${count} student${count === 1 ? "" : "s"}.`);
  }

  function updateSectionMeta(name: string, patch: Partial<SectionMeta>) {
    setSectionMeta((prev) => prev.map((s) => (s.name === name ? { ...s, ...patch } : s)));
  }

  function addSection(newSection: SectionMeta): boolean {
    if (sectionMeta.some((s) => s.name === newSection.name)) return false;
    setSectionMeta((prev) => [...prev, newSection]);
    setRoster((prev) => ({ ...prev, [newSection.name]: [] }));
    return true;
  }

  function deleteSection(name: string) {
    setSectionMeta((prev) => prev.filter((s) => s.name !== name));
    setRoster((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (section === name) {
      const remaining = sectionMeta.filter((s) => s.name !== name);
      if (remaining[0]) setSection(remaining[0].name);
    }
    showToast(`Section "${name}" deleted.`);
  }

  function exportCsv() {
    downloadCsv(
      isSearching ? "roster-search-results.csv" : `roster-${section}.csv`,
      ["Name", "Roll No", "Email", "Status", "Section", "Enrolled", "Attendance %", "Completion %"],
      students.map((s) => [
        s.name,
        s.rollNo ?? "—",
        s.email,
        s.status,
        s.section,
        s.enrolledDate,
        attendanceRate(s.id),
        SECTION_LESSON_COUNTS[s.section] > 0 ? completionRate(s.id, SECTION_LESSON_COUNTS[s.section]) : "—",
      ]),
    );
    showToast(`Exported ${students.length} student${students.length === 1 ? "" : "s"} to CSV.`);
  }

  return (
    <>
      <Seo title="Roster" description="Manage enrollment for your course sections." path="/staff/roster" />

      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Roster</h2>
          <p className="mt-1 text-[15px] text-(--color-slate)">Manage who's enrolled in each section.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setShowSections((v) => !v)}
            aria-expanded={showSections}
            className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-5 py-2.5 text-sm font-semibold text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            Manage sections
          </button>
          <Link
            to="/staff/invitations"
            className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            + Invite students
          </Link>
        </div>
      </Reveal>

      {showSections && (
        <SectionsPanel
          sections={sectionMeta}
          rosterCounts={Object.fromEntries(sectionNames.map((name) => [name, (roster[name] ?? []).length]))}
          onUpdate={updateSectionMeta}
          onAdd={addSection}
          onDelete={deleteSection}
        />
      )}

      <Reveal delay={0.1} className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {sectionNames.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSection(s);
                setSelected(new Set());
                setQuery("");
              }}
              className={
                section === s ? "rounded-full bg-(--color-ink) px-4 py-1.5 text-sm font-medium text-(--color-paper)" : "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 hover:text-(--color-ink)"
              }
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all sections…"
            className="w-full max-w-[220px] rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-1.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={students.length === 0}
            className="shrink-0 rounded-full border border-(--color-line) px-4 py-1.5 text-sm font-medium text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink) disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </Reveal>
      {isSearching && (
        <p className="mt-2 text-xs text-(--color-mist)">
          Searching all sections — {students.length} match{students.length === 1 ? "" : "es"}.
        </p>
      )}

      {selected.size > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-(--color-cloud) px-4 py-2.5 text-sm">
          <span className="truncate text-(--color-ink-soft)">
            {selected.size} selected: {selectedNames.join(", ")}
          </span>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={removeSelected} className="font-medium text-(--color-error) hover:text-(--color-error)/80">
              Remove
            </button>
          </div>
        </div>
      )}

      <StaggerGroup key={section} className="mt-4 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
          <div className="sticky top-0 z-10 flex items-center gap-2 bg-(--color-cloud) px-5 py-3 text-xs font-medium uppercase tracking-wide text-(--color-mist) sm:gap-4 border-b border-(--color-line)">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-(--color-line) accent-(--color-violet)"
            />
            <span className="flex-1">Student</span>
            <span className="hidden w-28 shrink-0 sm:block">Roll no.</span>
            {isSearching && <span className="hidden w-40 shrink-0 sm:block">Section</span>}
            <span className="w-24 shrink-0">Status</span>
            <span className="hidden w-24 shrink-0 sm:block">Attendance</span>
            <span className="hidden w-24 shrink-0 sm:block">Completion</span>
            <span className="hidden w-20 shrink-0 text-right sm:block">Enrolled</span>
            <span className="w-11 shrink-0" />
          </div>
          
        {students.map((student) => (
          <StaggerItem key={student.id} y={12} className="flex items-center gap-2 px-5 py-4 sm:gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(student.id)}
                    onChange={() => toggleOne(student.id)}
                    className="h-4 w-4 rounded border-(--color-line) accent-(--color-violet)"
                  />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink) font-mono text-xs font-semibold text-(--color-paper)">
                    {student.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </span>
                  <Link to={`/staff/students/${student.id}`} className="min-w-0 flex-1 hover:opacity-70">
                    <p className="truncate text-sm font-medium text-(--color-ink)">{student.name}</p>
                    <p className="truncate text-xs text-(--color-mist)">{student.email}</p>
                  </Link>
                  <span className="hidden w-28 shrink-0 truncate font-mono text-xs text-(--color-mist) sm:block">
                    {student.rollNo ?? "—"}
                  </span>
                  {isSearching && (
                    <span className="hidden w-40 shrink-0 truncate text-xs text-(--color-mist) sm:block">{student.section}</span>
                  )}
                  <span className="w-24 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-medium capitalize">
                    {student.status}
                  </span>
                  <div className="hidden w-24 shrink-0 items-center gap-1.5 sm:flex">
                    {student.status === "invited" ? (
                      <span className="text-[11px] text-(--color-mist)">—</span>
                    ) : (
                      <>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-line)">
                          <div className="h-full rounded-full bg-(--color-teal)" style={{ width: `${attendanceRate(student.id)}%` }} />
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-(--color-mist)">{attendanceRate(student.id)}%</span>
                      </>
                    )}
                  </div>
                  <div className="hidden w-24 shrink-0 items-center gap-1.5 sm:flex">
                    {student.status !== "invited" && SECTION_LESSON_COUNTS[student.section] > 0 ? (
                      <>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-line)">
                          <div
                            className="h-full rounded-full bg-(--color-violet)"
                            style={{ width: `${completionRate(student.id, SECTION_LESSON_COUNTS[student.section])}%` }}
                          />
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-(--color-mist)">
                          {completionRate(student.id, SECTION_LESSON_COUNTS[student.section])}%
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-(--color-mist)">—</span>
                    )}
                  </div>
                  <span className="hidden w-20 shrink-0 text-right font-mono text-xs text-(--color-mist) sm:block">{student.enrolledDate}</span>
                  <RowMenu
                    student={student}
                    onResend={() => showToast(`Invite resent to ${student.name}.`)}
                    onRemove={() => {
                      setStatus(student.id, "dropped");
                      showToast(`${student.name} removed from ${student.section}.`);
                    }}
                    onReactivate={() => {
                      setStatus(student.id, "active");
                      showToast(`${student.name} reactivated.`);
                    }}
                  />
                </StaggerItem>
              ))}
          {students.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <EnrollmentIcon />
              <p className="text-sm text-(--color-slate)">
                {query ? `No students match "${query}".` : "No students enrolled in this section yet."}
              </p>
            </div>
          )}
        </StaggerGroup>
    </>
  );
}
