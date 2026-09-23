import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { FilterBar } from "../../components/ui/FilterBar";
import { CoursesIcon } from "../../components/landing/icons";
import { fetchPublishedCourses, type DbCourseListRow } from "../../lib/coursesApi";

interface Course {
  id: string;
  title: string;
  instructor: string;
  modules: number;
  status: "enrolled" | "available";
  progress?: number;
  category: string;
}

const INITIAL_COURSES: Course[] = [
  { id: "1", title: "Intro to Design", instructor: "Devon Brooks", modules: 6, status: "enrolled", progress: 72, category: "Design" },
  { id: "2", title: "Data Structures", instructor: "Sana Malik", modules: 8, status: "enrolled", progress: 45, category: "Computer Science" },
  { id: "3", title: "UX Writing Basics", instructor: "Devon Brooks", modules: 4, status: "enrolled", progress: 0, category: "Design" },
  { id: "4", title: "Intro to Statistics", instructor: "Theo Callahan", modules: 10, status: "available", category: "Math" },
  { id: "5", title: "Public Speaking", instructor: "Sana Malik", modules: 5, status: "available", category: "Communication" },
];

const FILTERS: { label: string; value: "all" | "enrolled" | "available" }[] = [
  { label: "All", value: "all" },
  { label: "Enrolled", value: "enrolled" },
  { label: "Available", value: "available" },
];

function dbRowToCourse(row: DbCourseListRow): Course {
  return {
    id: row.id,
    title: row.title,
    instructor: "Staff",
    modules: 0,
    status: "available",
    category: "General",
  };
}

export function StudentCoursesPage() {
  const [courses, setCourses] = useState(INITIAL_COURSES);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "enrolled" | "available">("all");
  const [categoryFilter, setCategoryFilter] = useState("All subjects");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchPublishedCourses();
      if (cancelled) return;
      if (rows.length > 0) {
        setCourses(rows.map(dbRowToCourse));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => ["All subjects", ...Array.from(new Set(courses.map((c) => c.category)))], [courses]);

  const filtered = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" || c.status === filter) &&
          (categoryFilter === "All subjects" || c.category === categoryFilter),
      ),
    [courses, query, filter, categoryFilter],
  );

  function enroll(id: string) {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status: "enrolled", progress: 0 } : c)));
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-(--color-mist)">Loading…</div>;
  }

  return (
    <>
      <Seo title="My Courses" description="Browse and continue your courses on HanbeeLms." path="/student/courses" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Courses</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Continue an enrolled course, or browse what's available.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <FilterBar
          groups={[
            {
              label: "Status",
              options: FILTERS,
              value: filter,
              onChange: (v) => setFilter(v as "all" | "enrolled" | "available"),
            },
            {
              label: "Subject",
              options: categories.map((c) => ({ label: c, value: c })),
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
          className="w-full max-w-sm rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
        />
      </Reveal>

      {filtered.length === 0 ? (
        <Reveal delay={0.15} className="mt-16 text-center">
          <p className="text-sm text-(--color-slate)">No courses match "{query}".</p>
        </Reveal>
      ) : (
        <StaggerGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const content = (
              <>
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--color-violet-soft) text-(--color-violet)">
                    <CoursesIcon />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      course.status === "enrolled"
                        ? "bg-(--color-teal-soft) text-(--color-teal-deep)"
                        : "bg-(--color-cloud) text-(--color-slate)"
                    }`}
                  >
                    {course.status === "enrolled" ? "Enrolled" : "Available"}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">{course.title}</h3>
                <p className="mt-1 text-sm text-(--color-mist)">
                  {course.instructor} · {course.modules} modules
                </p>
                <span className="mt-2 inline-block rounded-full bg-(--color-cloud) px-2 py-0.5 text-xs font-medium text-(--color-slate)">
                  {course.category}
                </span>
                {course.status === "enrolled" && (
                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-(--color-line)">
                      <div className="h-full rounded-full bg-(--color-teal)" style={{ width: `${course.progress}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-(--color-mist)">{course.progress}% complete</p>
                  </div>
                )}
              </>
            );

            return (
              <StaggerItem
                key={course.id}
                className="rounded-2xl border border-(--color-line) transition-transform duration-300 hover:-translate-y-1"
              >
                {course.status === "enrolled" ? (
                  <Link to={`/student/courses/${course.id}/lessons/l1`} className="block p-6">
                    {content}
                  </Link>
                ) : (
                  <div className="p-6">
                    {content}
                    <button
                      type="button"
                      onClick={() => enroll(course.id)}
                      className="mt-4 w-full rounded-full bg-(--color-ink) py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.02]"
                    >
                      Enroll
                    </button>
                  </div>
                )}
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </>
  );
}
