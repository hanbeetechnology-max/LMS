import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { SchoolLayout } from "./SchoolLayout";

const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T & string) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

const SchoolOverviewPage = page(() => import("./SchoolOverviewPage"), "SchoolOverviewPage");
const SchoolStudentsPage = page(() => import("./SchoolStudentsPage"), "SchoolStudentsPage");
const SchoolTeamsPage = page(() => import("./SchoolTeamsPage"), "SchoolTeamsPage");
const SchoolCoursesPage = page(() => import("./SchoolCoursesPage"), "SchoolCoursesPage");
const AnnouncementsPage = page(() => import("../shared/AnnouncementsPage"), "AnnouncementsPage");
const SchedulePage = page(() => import("../shared/SchedulePage"), "SchedulePage");
const SettingsPage = page(() => import("../shared/SettingsPage"), "SettingsPage");
const ChatPage = page(() => import("../chat/ChatPage"), "ChatPage");

/** School staff portal. The guard also sends pending schools to
 *  /pending-approval and suspended or closed ones to /school-inactive. */
export const schoolRoutes: RouteObject = {
  path: "/school",
  element: (
    <ProtectedRoute role="school_staff">
      <SchoolLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="overview" replace /> },
    { path: "overview", element: <SchoolOverviewPage /> },
    { path: "students", element: <SchoolStudentsPage /> },
    { path: "teams", element: <SchoolTeamsPage /> },
    { path: "announcements", element: <AnnouncementsPage /> },
    { path: "schedule", element: <SchedulePage /> },
    { path: "chat", element: <ChatPage /> },
    { path: "courses", element: <SchoolCoursesPage /> },
    { path: "settings", element: <SettingsPage /> },
  ],
};
