export interface CourseTeaser {
  id: string;
  title: string;
  tagline: string;
  format: string;
  activeStudents: number;
}

export const AVAILABLE_COURSES: CourseTeaser[] = [
  {
    id: "1",
    title: "Intro to Design",
    tagline: "Color theory, typography, and layout fundamentals over 6 weeks.",
    format: "Cohort · 2 sections",
    activeStudents: 48,
  },
  {
    id: "2",
    title: "Data Structures",
    tagline: "Arrays through trees and graphs, at your own pace.",
    format: "Self-paced",
    activeStudents: 32,
  },
];

export interface ActivityItem {
  text: string;
  time: string;
}

export const RECENT_ACTIVITY: ActivityItem[] = [
  { text: "Ava Chen started Intro to Design", time: "2h ago" },
  { text: "Data Structures reached 32 active students", time: "1d ago" },
  { text: "Liam Cole completed Module 2 of Intro to Design", time: "2d ago" },
];

export const TESTIMONIAL = {
  quote: "The way lessons are laid out made it easy to keep going at my own pace — I never felt lost on what was next.",
  name: "Noah Patel",
  role: "Data Structures, current student",
};

export const NEXT_COHORT_LABEL = "Next cohort starts Oct 6";
