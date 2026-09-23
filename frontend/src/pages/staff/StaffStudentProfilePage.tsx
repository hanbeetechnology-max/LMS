import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { CountUp } from "../../components/ui/CountUp";
import { AttendanceIcon, MessagingIcon } from "../../components/landing/icons";
import { useToast } from "../../lib/ToastProvider";
import { findStudentById, STATUS_STYLES } from "../../lib/mockStaffRoster";
import { attendanceRate, getStudentRecord, type AttendanceStatus } from "../../lib/mockStudentRecords";

// Only "Intro to Design — Section B" has real lesson content in the mock
// Course Editor data (StaffCourseEditorPage's l1-l5); Data Structures has
// no authored lessons yet, so there's nothing to show progress against.
const INTRO_TO_DESIGN_LESSONS = [
  { id: "l1", title: "Welcome & syllabus" },
  { id: "l2", title: "Color theory basics" },
  { id: "l3", title: "Reading: principles of design" },
  { id: "l4", title: "Type pairing" },
  { id: "l5", title: "Further reading" },
];

const ATTENDANCE_STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  absent: "bg-(--color-error-soft) text-(--color-error)",
  late: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  excused: "bg-(--color-cloud) text-(--color-slate)",
};

export function StaffStudentProfilePage() {
  const { studentId = "" } = useParams();
  const { showToast } = useToast();
  const found = findStudentById(studentId);
  const record = getStudentRecord(studentId);
  const [notes, setNotes] = useState(record.notes);

  if (!found) {
    return (
      <>
        <Seo title="Student not found" description="This student could not be found." path="/staff/students" />
        <Reveal>
          <p className="text-sm text-(--color-slate)">
            This student couldn't be found.{" "}
            <Link to="/staff/roster" className="font-medium text-(--color-violet) hover:text-(--color-violet-deep)">
              Back to roster
            </Link>
          </p>
        </Reveal>
      </>
    );
  }

  const { student, section } = found;
  const showLessonProgress = section === "Intro to Design — Section B";
  const completedCount = showLessonProgress
    ? INTRO_TO_DESIGN_LESSONS.filter((l) => record.completedLessonIds.includes(l.id)).length
    : 0;

  function saveNotes() {
    showToast("Notes saved.");
  }

  return (
    <>
      <Seo title={student.name} description={`Manage ${student.name}'s enrollment, attendance, and progress.`} path={`/staff/students/${studentId}`} />

      <Reveal>
        <Link to="/staff/roster" className="text-sm font-medium text-(--color-slate) hover:text-(--color-ink)">
          ← Roster
        </Link>
      </Reveal>

      <Reveal delay={0.03} className="mt-4 flex flex-col gap-4 rounded-2xl border border-(--color-line) p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-(--color-ink) font-mono text-lg font-semibold text-(--color-paper)">
            {student.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">{student.name}</h1>
            <p className="text-sm text-(--color-mist)">{student.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-(--color-line) px-2.5 py-0.5 font-mono text-xs font-medium text-(--color-ink-soft)">
                {student.rollNo ?? "Roll no. pending"}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[student.status]}`}>
                {student.status}
              </span>
              <span className="rounded-full bg-(--color-cloud) px-2.5 py-0.5 text-xs font-medium text-(--color-slate)">{section}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-(--color-slate)">
              <span>Age {student.age}</span>
              <span>{student.institution}</span>
              <span>{student.phone}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2.5">
          <Link
            to="/staff/messages"
            className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            <MessagingIcon />
            Message
          </Link>
          <Link
            to="/staff/attendance"
            className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium text-(--color-ink-soft) transition-colors duration-200 hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            <AttendanceIcon />
            Mark attendance
          </Link>
        </div>
      </Reveal>

      <Reveal delay={0.06} className="mt-6 grid grid-cols-2 gap-6 border-b border-(--color-line) pb-8 sm:grid-cols-3">
        {[
          [`${attendanceRate(studentId)}%`, "attendance rate"],
          ...(showLessonProgress ? [[`${completedCount}/${INTRO_TO_DESIGN_LESSONS.length}`, "lessons completed"]] : []),
          [student.enrolledDate, "enrolled since"],
        ].map(([value, label], i) => (
          <div key={label}>
            <dd className="font-display text-3xl font-semibold text-(--color-ink)">
              <CountUp value={value} delay={0.15 + i * 0.08} />
            </dd>
            <p className="mt-1 text-sm text-(--color-mist)">{label}</p>
          </div>
        ))}
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-(--color-ink)">Attendance history</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-(--color-line)">
            <div className="flex items-center gap-4 bg-(--color-cloud) px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-(--color-mist)">
              <span className="flex-1">Session</span>
              <span className="shrink-0">Status</span>
            </div>
            <StaggerGroup className="flex flex-col divide-y divide-(--color-line)">
              {record.attendanceHistory.map((entry, i) => (
                <StaggerItem key={i} y={12} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                  <span className="flex-1 text-(--color-ink-soft)">{entry.session}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ATTENDANCE_STATUS_STYLES[entry.status]}`}
                  >
                    {entry.status}
                  </span>
                </StaggerItem>
              ))}
              {record.attendanceHistory.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No attendance recorded yet.</p>
              )}
            </StaggerGroup>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-(--color-ink)">Lesson progress</h2>
          {showLessonProgress ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-(--color-line)">
              <div className="flex items-center gap-4 bg-(--color-cloud) px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-(--color-mist)">
                <span className="flex-1">Lesson</span>
                <span className="shrink-0">Status</span>
              </div>
              <StaggerGroup className="flex flex-col divide-y divide-(--color-line)">
                {INTRO_TO_DESIGN_LESSONS.map((lesson) => {
                  const done = record.completedLessonIds.includes(lesson.id);
                  return (
                    <StaggerItem key={lesson.id} y={12} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                      <span className={`flex-1 ${done ? "text-(--color-ink-soft)" : "text-(--color-mist)"}`}>{lesson.title}</span>
                      <span className={`shrink-0 text-xs font-medium ${done ? "text-(--color-teal-deep)" : "text-(--color-mist)"}`}>
                        {done ? "✓ Complete" : "Not started"}
                      </span>
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-(--color-line) px-5 py-8 text-center text-sm text-(--color-slate)">
              No published lesson content for this course yet.
            </p>
          )}
        </div>
      </div>

      <Reveal delay={0.1} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <h2 className="font-display text-lg font-semibold text-(--color-ink)">Staff notes</h2>
        <p className="mt-1 text-sm text-(--color-mist)">Private — only visible to staff.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add a note about this student…"
          className="mt-3 w-full resize-none rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
        />
        <button
          type="button"
          onClick={saveNotes}
          className="mt-3 rounded-full bg-(--color-ink) px-5 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
        >
          Save note
        </button>
      </Reveal>
    </>
  );
}
