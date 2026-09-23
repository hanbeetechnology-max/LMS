import type { DayEntry } from "./mockStaffTimeTracking";

export interface StaffSummary {
  id: string;
  name: string;
  role: string;
  history: DayEntry[];
  taskCompletion: number;
}

function weeklyHours(history: DayEntry[]): number {
  return history.slice(-5).reduce((sum, d) => sum + d.hoursWorked, 0);
}

function onTimeRate(history: DayEntry[]): number {
  const recent = history.slice(-5);
  return Math.round((recent.filter((d) => d.onTime).length / recent.length) * 100);
}

// A separate seeded roster from mockStaffTimeTracking.ts's single-person
// TWO_WEEK_HISTORY (which the individual /staff/performance page reads for
// "you") — this is the Manager-scope superset, covering every staff member.
export const STAFF_DIRECTORY: StaffSummary[] = [
  {
    id: "staff-1",
    name: "Jamie Rivera",
    role: "Instructor — Intro to Design, Data Structures",
    taskCompletion: 75,
    history: [
      { date: "Mon, Sep 8", hoursWorked: 7.5, onTime: true, clockIn: "9:02 AM", clockOut: "4:32 PM" },
      { date: "Tue, Sep 9", hoursWorked: 8.1, onTime: true, clockIn: "8:58 AM", clockOut: "5:05 PM" },
      { date: "Wed, Sep 10", hoursWorked: 6.8, onTime: false, clockIn: "9:23 AM", clockOut: "4:12 PM" },
      { date: "Thu, Sep 11", hoursWorked: 7.9, onTime: true, clockIn: "9:00 AM", clockOut: "4:54 PM" },
      { date: "Fri, Sep 12", hoursWorked: 6.2, onTime: true, clockIn: "9:03 AM", clockOut: "3:16 PM" },
    ],
  },
  {
    id: "staff-2",
    name: "Devika Rao",
    role: "Instructor — UX Writing Basics",
    taskCompletion: 88,
    history: [
      { date: "Mon, Sep 8", hoursWorked: 7.0, onTime: true, clockIn: "8:55 AM", clockOut: "3:58 PM" },
      { date: "Tue, Sep 9", hoursWorked: 7.2, onTime: true, clockIn: "8:50 AM", clockOut: "4:05 PM" },
      { date: "Wed, Sep 10", hoursWorked: 7.1, onTime: true, clockIn: "8:57 AM", clockOut: "4:02 PM" },
      { date: "Thu, Sep 11", hoursWorked: 5.4, onTime: true, clockIn: "8:59 AM", clockOut: "2:23 PM" },
      { date: "Fri, Sep 12", hoursWorked: 7.3, onTime: false, clockIn: "9:18 AM", clockOut: "4:35 PM" },
    ],
  },
  {
    id: "staff-3",
    name: "Elliot Cross",
    role: "Instructor — Intro to Statistics",
    taskCompletion: 60,
    history: [
      { date: "Mon, Sep 8", hoursWorked: 6.5, onTime: false, clockIn: "9:20 AM", clockOut: "3:48 PM" },
      { date: "Tue, Sep 9", hoursWorked: 7.8, onTime: true, clockIn: "8:59 AM", clockOut: "4:47 PM" },
      { date: "Wed, Sep 10", hoursWorked: 7.4, onTime: true, clockIn: "9:00 AM", clockOut: "4:24 PM" },
      { date: "Thu, Sep 11", hoursWorked: 8.0, onTime: true, clockIn: "8:56 AM", clockOut: "4:58 PM" },
      { date: "Fri, Sep 12", hoursWorked: 6.9, onTime: true, clockIn: "9:01 AM", clockOut: "3:57 PM" },
    ],
  },
];

export function staffWeeklyHours(staff: StaffSummary): number {
  return weeklyHours(staff.history);
}

export function staffOnTimeRate(staff: StaffSummary): number {
  return onTimeRate(staff.history);
}
