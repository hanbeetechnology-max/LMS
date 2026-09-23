export interface StaffTask {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

export const INITIAL_TASKS: StaffTask[] = [
  { id: "t1", title: "Prepare Week 5 slides for Intro to Design", dueDate: "Fri, Sep 12", done: false },
  { id: "t2", title: "Review pending invitations for Data Structures", dueDate: "Mon, Sep 8", done: false },
  { id: "t3", title: "Reply to Liam Cole's message", dueDate: "Today", done: false },
  { id: "t4", title: "Update syllabus for Fall term", dueDate: "Sep 20", done: true },
];

/**
 * Reads the seeded INITIAL_TASKS, not TasksWidget's live component state —
 * same no-shared-cross-page-store limitation as everything else this session
 * (see docs/PLAN.md §10.20). Good enough for a summary stat, not a live sync.
 */
export function taskCompletionRate(): number {
  return Math.round((INITIAL_TASKS.filter((t) => t.done).length / INITIAL_TASKS.length) * 100);
}
