export interface Notification {
  id: string;
  title: string;
  time: string;
  read: boolean;
  linkTo: string;
}

export const STAFF_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Grace Okafor applied to Intro to Design", time: "3h ago", read: false, linkTo: "/staff/inquiries" },
  { id: "n2", title: "Ava Chen submitted attendance for Section B", time: "5h ago", read: false, linkTo: "/staff/attendance" },
  { id: "n3", title: "New reply in \"Welcome\" discussion thread", time: "1d ago", read: false, linkTo: "/staff/forums" },
  { id: "n4", title: "Liam Cole accepted their invite to Data Structures", time: "3d ago", read: true, linkTo: "/staff/roster" },
];

export const STUDENT_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "New announcement posted in Intro to Design", time: "1h ago", read: false, linkTo: "/student/announcements" },
  { id: "n2", title: "Office hours scheduled for Thursday, 3:00 PM", time: "6h ago", read: false, linkTo: "/student/calendar" },
  { id: "n3", title: "You have a new message from Jamie Rivera", time: "1d ago", read: false, linkTo: "/student/messages" },
  { id: "n4", title: "Reminder: Module 2 lesson due this week", time: "2d ago", read: true, linkTo: "/student/courses" },
];

export const MANAGER_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Grace Okafor is waiting on verification", time: "3h ago", read: false, linkTo: "/manager/dashboard" },
  { id: "n2", title: "Jamie Rivera clocked in for the day", time: "5h ago", read: false, linkTo: "/manager/dashboard" },
  { id: "n3", title: "New holiday added: Founders' Day", time: "1d ago", read: true, linkTo: "/manager/dashboard" },
];
