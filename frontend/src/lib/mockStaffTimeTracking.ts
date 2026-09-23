export interface DayEntry {
  date: string;
  hoursWorked: number;
  onTime: boolean;
  clockIn: string;
  clockOut: string;
}

/**
 * Seeded history for the past few workdays — mirrors the mockStudentRecords.ts
 * pattern (lib/mockStudentRecords.ts). Today's actual clock-in/break state is
 * ephemeral local component state in TimeClockWidget, not tracked here — it
 * doesn't need to survive a remount any more than Roster's or Attendance's
 * local state does today.
 */
export const WEEK_HISTORY: DayEntry[] = [
  { date: "Mon, Sep 8", hoursWorked: 7.5, onTime: true, clockIn: "9:02 AM", clockOut: "4:32 PM" },
  { date: "Tue, Sep 9", hoursWorked: 8.1, onTime: true, clockIn: "8:58 AM", clockOut: "5:05 PM" },
  { date: "Wed, Sep 10", hoursWorked: 6.8, onTime: false, clockIn: "9:23 AM", clockOut: "4:12 PM" },
  { date: "Thu, Sep 11", hoursWorked: 7.9, onTime: true, clockIn: "9:00 AM", clockOut: "4:54 PM" },
];

export function weeklyHoursTotal(): number {
  return WEEK_HISTORY.reduce((sum, day) => sum + day.hoursWorked, 0);
}

export function onTimeRate(): number {
  return Math.round((WEEK_HISTORY.filter((d) => d.onTime).length / WEEK_HISTORY.length) * 100);
}

/**
 * A longer history for the /staff/performance trend chart — separate from
 * WEEK_HISTORY (which TimeClockWidget's "this week" stats read) so extending
 * it doesn't change the dashboard widget's numbers. 10 workdays clears the
 * "4+ points" bar this session has used to justify a real trend chart over a
 * stat card (see docs/PLAN.md §12 chart-volume guidance).
 */
export const TWO_WEEK_HISTORY: DayEntry[] = [
  { date: "Mon, Aug 25", hoursWorked: 7.2, onTime: true, clockIn: "9:01 AM", clockOut: "4:13 PM" },
  { date: "Tue, Aug 26", hoursWorked: 8.0, onTime: true, clockIn: "8:55 AM", clockOut: "4:55 PM" },
  { date: "Wed, Aug 27", hoursWorked: 6.5, onTime: false, clockIn: "9:19 AM", clockOut: "3:49 PM" },
  { date: "Thu, Aug 28", hoursWorked: 7.8, onTime: true, clockIn: "9:00 AM", clockOut: "4:48 PM" },
  { date: "Fri, Aug 29", hoursWorked: 5.9, onTime: true, clockIn: "9:05 AM", clockOut: "3:00 PM" },
  { date: "Mon, Sep 8", hoursWorked: 7.5, onTime: true, clockIn: "9:02 AM", clockOut: "4:32 PM" },
  { date: "Tue, Sep 9", hoursWorked: 8.1, onTime: true, clockIn: "8:58 AM", clockOut: "5:05 PM" },
  { date: "Wed, Sep 10", hoursWorked: 6.8, onTime: false, clockIn: "9:23 AM", clockOut: "4:12 PM" },
  { date: "Thu, Sep 11", hoursWorked: 7.9, onTime: true, clockIn: "9:00 AM", clockOut: "4:54 PM" },
  { date: "Fri, Sep 12", hoursWorked: 6.2, onTime: true, clockIn: "9:03 AM", clockOut: "3:16 PM" },
];
