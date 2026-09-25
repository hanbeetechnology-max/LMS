import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { ProtectedRoute } from "../../routes/ProtectedRoute";
import { StudentPortalLayout } from "./StudentPortalLayout";

const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T & string) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

const RcOverviewPage = page(() => import("./RcOverviewPage"), "RcOverviewPage");
const RcLeaderboardPage = page(() => import("./RcLeaderboardPage"), "RcLeaderboardPage");
const RcTeamPage = page(() => import("./RcTeamPage"), "RcTeamPage");
const LmsOverviewPage = page(() => import("./LmsOverviewPage"), "LmsOverviewPage");
const LmsCoursesPage = page(() => import("./LmsCoursesPage"), "LmsCoursesPage");
const AnnouncementsPage = page(() => import("../shared/AnnouncementsPage"), "AnnouncementsPage");
const SettingsPage = page(() => import("../shared/SettingsPage"), "SettingsPage");
const ChatPage = page(() => import("../chat/ChatPage"), "ChatPage");
// Existing, still-used learning screens.
const StudentLessonViewerPage = page(() => import("../../pages/student/StudentLessonViewerPage"), "StudentLessonViewerPage");
const StudentCertificatePage = page(() => import("../../pages/student/StudentCertificatePage"), "StudentCertificatePage");
const AttendancePage = page(() => import("./AttendancePage"), "AttendancePage");
const StudentAiPage = page(() => import("../../pages/student/StudentAiPage"), "StudentAiPage");

/** Student portal: the tournament side (/student/rc) comes first, the learning
 *  side (/student/lms) second. Chat and announcements are shared by both. */
export const studentRoutes: RouteObject = {
  path: "/student",
  element: (
    <ProtectedRoute role="student">
      <StudentPortalLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="rc" replace /> },
    { path: "rc", element: <RcOverviewPage /> },
    { path: "rc/leaderboard", element: <RcLeaderboardPage /> },
    { path: "rc/team", element: <RcTeamPage /> },
    { path: "lms", element: <LmsOverviewPage /> },
    { path: "lms/courses", element: <LmsCoursesPage /> },
    { path: "lms/attendance", element: <AttendancePage /> },
    { path: "lms/ai", element: <StudentAiPage /> },
    { path: "courses/:id/lessons/:lessonId", element: <StudentLessonViewerPage /> },
    { path: "courses/:id/certificate", element: <StudentCertificatePage /> },
    { path: "announcements", element: <AnnouncementsPage /> },
    { path: "chat", element: <ChatPage /> },
    { path: "settings", element: <SettingsPage /> },
  ],
};
