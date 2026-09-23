import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { FilterBar } from "../../components/ui/FilterBar";
import { CoursesIcon } from "../../components/landing/icons";
import { getCourseTypeMeta, type CourseType } from "../../lib/courseTypes";

type Status = "draft" | "published" | "archived";

interface Course {
  id: string;
  title: string;
  sections: number;
  enrolled: number;
  status: Status;
  type: CourseType;
  category: string;
  updated: string;
}

const INITIAL_COURSES: Course[] = [
  { id: "1", title: "Intro to Design", sections: 2, enrolled: 48, status: "published", type: "cohort", category: "Design", updated: "2 days ago" },
  { id: "2", title: "Data Structures", sections: 1, enrolled: 32, status: "published", type: "self-paced", category: "Computer Science", updated: "5 days ago" },
  { id: "3", title: "UX Writing Basics", sections: 1, enrolled: 16, status: "draft", type: "reading", category: "Design", updated: "1 week ago" },
  { id: "4", title: "Intro to Statistics — Fall 2025", sections: 1, enrolled: 0, status: "archived", type: "self-paced", category: "Math", updated: "3 months ago" },
];

const CATEGORIES = ["All subjects", ...Array.from(new Set(INITIAL_COURSES.map((c) => c.category)))];

const FILTERS: { label: string; value: Status | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const STATUS_STYLES: Record<Status, string> = {
  draft: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  published: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  archived: "bg-(--color-cloud) text-(--color-slate)",
};

export function StaffCoursesPage() {
  const [courses] = useState(INITIAL_COURSES);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("All subjects");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      courses.filter(
        (c) =>
          (filter === "all" || c.status === filter) &&
          (categoryFilter === "All subjects" || c.category === categoryFilter) &&
          c.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [courses, filter, categoryFilter, query],
  );

  return (
    <>
      <Seo title="Courses" description="Manage your courses on HanbeeLms." path="/staff/courses" />

      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Courses</h2>
          <p className="mt-1 text-[15px] text-(--color-slate)">Manage the courses you teach.</p>
        </div>
        <Link
          to="/staff/courses/new"
          className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
        >
          + New course
        </Link>
      </Reveal>

      <Reveal delay={0.1} className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <FilterBar
          groups={[
            {
              label: "Status",
              options: FILTERS,
              value: filter,
              onChange: (v) => setFilter(v as Status | "all"),
            },
            {
              label: "Subject",
              options: CATEGORIES.map((c) => ({ label: c, value: c })),
              value: categoryFilter,
              onChange: setCategoryFilter,
            },
          ]}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses…"
          className="w-full max-w-[240px] rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-1.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
        />
      </Reveal>

      <StaggerGroup className="mt-6 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
        {filtered.map((course) => (
          <StaggerItem key={course.id} y={12}>
            <Link
              to={`/staff/courses/${course.id}/edit`}
              className="flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-(--color-cloud)"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-violet-soft) text-(--color-violet)">
                <CoursesIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--color-ink)">{course.title}</p>
                <p className="text-xs text-(--color-mist)">
                  {course.sections} {course.sections === 1 ? "section" : "sections"} · {course.enrolled} enrolled
                </p>
              </div>
              <span className="hidden shrink-0 rounded-full border border-(--color-line) px-2.5 py-0.5 text-xs font-medium text-(--color-ink-soft) sm:inline-block">
                {course.category}
              </span>
              <span className="hidden shrink-0 rounded-full bg-(--color-cloud) px-2.5 py-0.5 text-xs font-medium text-(--color-slate) sm:inline-block">
                {getCourseTypeMeta(course.type).label}
              </span>
              <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-block ${STATUS_STYLES[course.status]}`}>
                {course.status}
              </span>
              <span className="hidden shrink-0 font-mono text-xs text-(--color-mist) sm:inline-block">{course.updated}</span>
            </Link>
          </StaggerItem>
        ))}
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No courses match this filter.</p>
        )}
      </StaggerGroup>
    </>
  );
}
