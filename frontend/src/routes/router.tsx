import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { StaffLayout } from "../layouts/StaffLayout";
import { StudentLayout } from "../layouts/StudentLayout";
import { ManagerLayout } from "../layouts/ManagerLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";

// Every page is code-split via React.lazy so a first visit only downloads
// the JS it actually needs (e.g. a marketing visitor doesn't fetch the
// entire staff/student app). Suspense fallback is wired in main.tsx around
// <RouterProvider>. Layouts, ProtectedRoute, and RouteErrorBoundary stay
// eager — they're small and needed on every authenticated route anyway.
const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("../pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const ManagerSetupPage = lazy(() => import("../pages/ManagerSetupPage").then((m) => ({ default: m.ManagerSetupPage })));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const AcceptInvitePage = lazy(() => import("../pages/AcceptInvitePage").then((m) => ({ default: m.AcceptInvitePage })));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const NotAuthorizedPage = lazy(() => import("../pages/NotAuthorizedPage").then((m) => ({ default: m.NotAuthorizedPage })));
const PendingApprovalPage = lazy(() => import("../pages/PendingApprovalPage").then((m) => ({ default: m.PendingApprovalPage })));
const ApplyPage = lazy(() => import("../pages/ApplyPage").then((m) => ({ default: m.ApplyPage })));
const TournamentPage = lazy(() => import("../pages/TournamentPage").then((m) => ({ default: m.TournamentPage })));
const VerifyCertificatePage = lazy(() => import("../pages/VerifyCertificatePage").then((m) => ({ default: m.VerifyCertificatePage })));
const AboutPage = lazy(() => import("../pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("../pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import("../pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("../pages/TermsPage").then((m) => ({ default: m.TermsPage })));

const StaffDashboardPage = lazy(() => import("../pages/staff/StaffDashboardPage").then((m) => ({ default: m.StaffDashboardPage })));
const StaffCoursesPage = lazy(() => import("../pages/staff/StaffCoursesPage").then((m) => ({ default: m.StaffCoursesPage })));
const StaffNewCoursePage = lazy(() => import("../pages/staff/StaffNewCoursePage").then((m) => ({ default: m.StaffNewCoursePage })));
const StaffCourseEditorPage = lazy(() => import("../pages/staff/StaffCourseEditorPage").then((m) => ({ default: m.StaffCourseEditorPage })));
const StaffRosterPage = lazy(() => import("../pages/staff/StaffRosterPage").then((m) => ({ default: m.StaffRosterPage })));
const StaffStudentProfilePage = lazy(() => import("../pages/staff/StaffStudentProfilePage").then((m) => ({ default: m.StaffStudentProfilePage })));
const StaffInvitationsPage = lazy(() => import("../pages/staff/StaffInvitationsPage").then((m) => ({ default: m.StaffInvitationsPage })));
const StaffInquiriesPage = lazy(() => import("../pages/staff/StaffInquiriesPage").then((m) => ({ default: m.StaffInquiriesPage })));
const StaffPerformancePage = lazy(() => import("../pages/staff/StaffPerformancePage").then((m) => ({ default: m.StaffPerformancePage })));
const StaffAttendancePage = lazy(() => import("../pages/staff/StaffAttendancePage").then((m) => ({ default: m.StaffAttendancePage })));
const StaffCalendarPage = lazy(() => import("../pages/staff/StaffCalendarPage").then((m) => ({ default: m.StaffCalendarPage })));
const StaffAnnouncementsPage = lazy(() => import("../pages/staff/StaffAnnouncementsPage").then((m) => ({ default: m.StaffAnnouncementsPage })));
const StaffForumsPage = lazy(() => import("../pages/staff/StaffForumsPage").then((m) => ({ default: m.StaffForumsPage })));
const StaffMessagesPage = lazy(() => import("../pages/staff/StaffMessagesPage").then((m) => ({ default: m.StaffMessagesPage })));
const StaffSettingsPage = lazy(() => import("../pages/staff/StaffSettingsPage").then((m) => ({ default: m.StaffSettingsPage })));

const StudentDashboardPage = lazy(() => import("../pages/student/StudentDashboardPage").then((m) => ({ default: m.StudentDashboardPage })));
const StudentCoursesPage = lazy(() => import("../pages/student/StudentCoursesPage").then((m) => ({ default: m.StudentCoursesPage })));
const StudentLessonViewerPage = lazy(() => import("../pages/student/StudentLessonViewerPage").then((m) => ({ default: m.StudentLessonViewerPage })));
const StudentCertificatePage = lazy(() => import("../pages/student/StudentCertificatePage").then((m) => ({ default: m.StudentCertificatePage })));
const StudentEnrollmentsPage = lazy(() => import("../pages/student/StudentEnrollmentsPage").then((m) => ({ default: m.StudentEnrollmentsPage })));
const StudentAttendancePage = lazy(() => import("../pages/student/StudentAttendancePage").then((m) => ({ default: m.StudentAttendancePage })));
const StudentCalendarPage = lazy(() => import("../pages/student/StudentCalendarPage").then((m) => ({ default: m.StudentCalendarPage })));
const StudentAnnouncementsPage = lazy(() => import("../pages/student/StudentAnnouncementsPage").then((m) => ({ default: m.StudentAnnouncementsPage })));
const StudentForumsPage = lazy(() => import("../pages/student/StudentForumsPage").then((m) => ({ default: m.StudentForumsPage })));
const StudentMessagesPage = lazy(() => import("../pages/student/StudentMessagesPage").then((m) => ({ default: m.StudentMessagesPage })));
const StudentSettingsPage = lazy(() => import("../pages/student/StudentSettingsPage").then((m) => ({ default: m.StudentSettingsPage })));
const StudentAiPage = lazy(() => import("../pages/student/StudentAiPage").then((m) => ({ default: m.StudentAiPage })));

const ManagerDashboardPage = lazy(() => import("../pages/manager/ManagerDashboardPage").then((m) => ({ default: m.ManagerDashboardPage })));
const ManagerVerificationsPage = lazy(() => import("../pages/manager/ManagerVerificationsPage").then((m) => ({ default: m.ManagerVerificationsPage })));
const ManagerHolidaysPage = lazy(() => import("../pages/manager/ManagerHolidaysPage").then((m) => ({ default: m.ManagerHolidaysPage })));
const ManagerStaffPage = lazy(() => import("../pages/manager/ManagerStaffPage").then((m) => ({ default: m.ManagerStaffPage })));
const ManagerSettingsPage = lazy(() => import("../pages/manager/ManagerSettingsPage").then((m) => ({ default: m.ManagerSettingsPage })));

// Dev-only: exercises RouteErrorBoundary in tests/e2e/error-boundary.spec.ts.
// import.meta.env.DEV is resolved statically by Vite, so this route (and
// DevCrashTestPage) is stripped entirely from production builds.
const DevCrashTestPage = import.meta.env.DEV
  ? lazy(() => import("../pages/DevCrashTestPage").then((m) => ({ default: m.DevCrashTestPage })))
  : null;

export const router = createBrowserRouter([
  {
    // Pathless root route: its errorElement catches render/loader/action
    // errors from every route below, since React Router bubbles an error up
    // to the nearest ancestor route that defines one.
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      ...(DevCrashTestPage ? [{ path: "/__dev/crash-test", element: <DevCrashTestPage /> }] : []),
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/signup",
        element: <SignupPage />,
      },
      {
        path: "/setup",
        element: <ManagerSetupPage />,
      },
      {
        path: "/reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "/accept-invite",
        element: <AcceptInvitePage />,
      },
      {
        path: "/not-authorized",
        element: <NotAuthorizedPage />,
      },
      {
        path: "/pending-approval",
        element: <PendingApprovalPage />,
      },
      {
        path: "/apply",
        element: <ApplyPage />,
      },
      {
        path: "/tournament",
        element: <TournamentPage />,
      },
      {
        path: "/verify/:certificateId",
        element: <VerifyCertificatePage />,
      },
      {
        path: "/about",
        element: <AboutPage />,
      },
      {
        path: "/contact",
        element: <ContactPage />,
      },
      {
        path: "/privacy",
        element: <PrivacyPage />,
      },
      {
        path: "/terms",
        element: <TermsPage />,
      },
      {
        path: "/staff",
        element: (
          <ProtectedRoute role="staff">
            <StaffLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: "dashboard", element: <StaffDashboardPage /> },
          { path: "courses", element: <StaffCoursesPage /> },
          { path: "courses/new", element: <StaffNewCoursePage /> },
          { path: "courses/:id/edit", element: <StaffCourseEditorPage /> },
          { path: "roster", element: <StaffRosterPage /> },
          { path: "students/:studentId", element: <StaffStudentProfilePage /> },
          { path: "invitations", element: <StaffInvitationsPage /> },
          { path: "inquiries", element: <StaffInquiriesPage /> },
          { path: "performance", element: <StaffPerformancePage /> },
          { path: "attendance", element: <StaffAttendancePage /> },
          { path: "calendar", element: <StaffCalendarPage /> },
          { path: "announcements", element: <StaffAnnouncementsPage /> },
          { path: "forums", element: <StaffForumsPage /> },
          { path: "messages", element: <StaffMessagesPage /> },
          { path: "settings", element: <StaffSettingsPage /> },
        ],
      },
      {
        path: "/student",
        element: (
          <ProtectedRoute role="student">
            <StudentLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: "dashboard", element: <StudentDashboardPage /> },
          { path: "courses", element: <StudentCoursesPage /> },
          { path: "courses/:id/lessons/:lessonId", element: <StudentLessonViewerPage /> },
          { path: "courses/:id/certificate", element: <StudentCertificatePage /> },
          { path: "enrollments", element: <StudentEnrollmentsPage /> },
          { path: "attendance", element: <StudentAttendancePage /> },
          { path: "calendar", element: <StudentCalendarPage /> },
          { path: "announcements", element: <StudentAnnouncementsPage /> },
          { path: "forums", element: <StudentForumsPage /> },
          { path: "messages", element: <StudentMessagesPage /> },
          { path: "settings", element: <StudentSettingsPage /> },
          { path: "ai", element: <StudentAiPage /> },
        ],
      },
      {
        path: "/manager",
        element: (
          <ProtectedRoute role="manager">
            <ManagerLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: "dashboard", element: <ManagerDashboardPage /> },
          { path: "verifications", element: <ManagerVerificationsPage /> },
          { path: "holidays", element: <ManagerHolidaysPage /> },
          { path: "staff", element: <ManagerStaffPage /> },
          { path: "settings", element: <ManagerSettingsPage /> },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
