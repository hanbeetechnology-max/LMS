export type ContentType = "video" | "document" | "slides" | "link" | "text";
export type CoverAccent = "--color-violet" | "--color-teal" | "--color-amber";
export const COVER_ACCENTS: CoverAccent[] = ["--color-violet", "--color-teal", "--color-amber"];
export type CourseType = "self-paced" | "cohort" | "video" | "reading";

export interface CourseTypeMeta {
  id: CourseType;
  label: string;
  description: string;
  defaultContentType: ContentType;
  accent: CoverAccent;
}

export const COURSE_TYPES: CourseTypeMeta[] = [
  {
    id: "self-paced",
    label: "Self-paced",
    description: "Students move through content on their own schedule — no fixed sessions.",
    defaultContentType: "text",
    accent: "--color-violet",
  },
  {
    id: "cohort",
    label: "Cohort / Scheduled",
    description: "A fixed group moves together, with scheduled sessions and attendance.",
    defaultContentType: "text",
    accent: "--color-teal",
  },
  {
    id: "video",
    label: "Video course",
    description: "Lessons are primarily video lectures.",
    defaultContentType: "video",
    accent: "--color-amber",
  },
  {
    id: "reading",
    label: "Reading course",
    description: "Lessons are primarily documents and readings.",
    defaultContentType: "document",
    accent: "--color-violet",
  },
];

export function getCourseTypeMeta(type: CourseType): CourseTypeMeta {
  return COURSE_TYPES.find((t) => t.id === type) ?? COURSE_TYPES[0];
}
