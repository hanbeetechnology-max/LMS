import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { ManagerPortalLayout } from "./ManagerPortalLayout";

const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T & string) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

const MonitorPage = page(() => import("./MonitorPage"), "MonitorPage");
const VerificationsPage = page(() => import("./VerificationsPage"), "VerificationsPage");
const ManagerSchoolsPage = page(() => import("./ManagerSchoolsPage"), "ManagerSchoolsPage");
const StaffOverviewPage = page(() => import("./StaffOverviewPage"), "StaffOverviewPage");
// The school detail screen is built once, in the Hanbee staff portal, and reused here.
const SchoolDetailPage = page(() => import("../hanbee/SchoolDetailPage"), "SchoolDetailPage");
const AnnouncementsPage = page(() => import("../shared/AnnouncementsPage"), "AnnouncementsPage");
const TasksPage = page(() => import("../shared/TasksPage"), "TasksPage");
const SettingsPage = page(() => import("../shared/SettingsPage"), "SettingsPage");
const ChatPage = page(() => import("../chat/ChatPage"), "ChatPage");

/** Manager portal (role `manager`). */
export const managerRoutes: RouteObject = {
  path: "/manager",
  element: (
    <ProtectedRoute role="manager">
      <ManagerPortalLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="monitor" replace /> },
    { path: "monitor", element: <MonitorPage /> },
    { path: "verifications", element: <VerificationsPage /> },
    { path: "schools", element: <ManagerSchoolsPage /> },
    { path: "schools/:orgId", element: <SchoolDetailPage /> },
    { path: "staff", element: <StaffOverviewPage /> },
    { path: "announcements", element: <AnnouncementsPage /> },
    { path: "tasks", element: <TasksPage /> },
    { path: "chat", element: <ChatPage /> },
    { path: "settings", element: <SettingsPage /> },
  ],
};
