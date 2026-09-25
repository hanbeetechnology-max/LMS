import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { HanbeeLayout } from "./HanbeeLayout";

const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T & string) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

const MySpacePage = page(() => import("./MySpacePage"), "MySpacePage");
const TournamentManagePage = page(() => import("./TournamentManagePage"), "TournamentManagePage");
const HanbeeLmsOverviewPage = page(() => import("./HanbeeLmsOverviewPage"), "HanbeeLmsOverviewPage");
const SchoolsPage = page(() => import("./SchoolsPage"), "SchoolsPage");
const SchoolDetailPage = page(() => import("./SchoolDetailPage"), "SchoolDetailPage");
const CoursesPage = page(() => import("./CoursesPage"), "CoursesPage");
const ApplicationsPage = page(() => import("./ApplicationsPage"), "ApplicationsPage");
const AnnouncementsPage = page(() => import("../shared/AnnouncementsPage"), "AnnouncementsPage");
const TasksPage = page(() => import("../shared/TasksPage"), "TasksPage");
const SchedulePage = page(() => import("../shared/SchedulePage"), "SchedulePage");
const SettingsPage = page(() => import("../shared/SettingsPage"), "SettingsPage");
const ChatPage = page(() => import("../chat/ChatPage"), "ChatPage");
// Existing, still-used course editing screens.
const StaffNewCoursePage = page(() => import("../../pages/staff/StaffNewCoursePage"), "StaffNewCoursePage");
const StaffCourseEditorPage = page(() => import("../../pages/staff/StaffCourseEditorPage"), "StaffCourseEditorPage");

/** Hanbee staff portal (role `staff`). */
export const hanbeeRoutes: RouteObject = {
  path: "/staff",
  element: (
    <ProtectedRoute role="staff">
      <HanbeeLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="my-space" replace /> },
    { path: "my-space", element: <MySpacePage /> },
    { path: "tournament", element: <TournamentManagePage /> },
    { path: "lms", element: <HanbeeLmsOverviewPage /> },
    { path: "schools", element: <SchoolsPage /> },
    { path: "schools/:orgId", element: <SchoolDetailPage /> },
    { path: "courses", element: <CoursesPage /> },
    { path: "courses/new", element: <StaffNewCoursePage /> },
    { path: "courses/:id/edit", element: <StaffCourseEditorPage /> },
    { path: "applications", element: <ApplicationsPage /> },
    { path: "announcements", element: <AnnouncementsPage /> },
    { path: "schedule", element: <SchedulePage /> },
    { path: "tasks", element: <TasksPage /> },
    { path: "chat", element: <ChatPage /> },
    { path: "settings", element: <SettingsPage /> },
  ],
};
