import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T & string) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

// Existing screens, restyled and rewired by the auth workstream.
const LoginPage = page(() => import("../../pages/LoginPage"), "LoginPage");
const SignupPage = page(() => import("../../pages/SignupPage"), "SignupPage");
const ManagerSetupPage = page(() => import("../../pages/ManagerSetupPage"), "ManagerSetupPage");
const ResetPasswordPage = page(() => import("../../pages/ResetPasswordPage"), "ResetPasswordPage");
const AcceptInvitePage = page(() => import("../../pages/AcceptInvitePage"), "AcceptInvitePage");
const PendingApprovalPage = page(() => import("../../pages/PendingApprovalPage"), "PendingApprovalPage");
// New screens.
const RegisterSchoolPage = page(() => import("./RegisterSchoolPage"), "RegisterSchoolPage");
const JoinSchoolPage = page(() => import("./JoinSchoolPage"), "JoinSchoolPage");
const AccountSuspendedPage = page(() => import("./AccountSuspendedPage"), "AccountSuspendedPage");
const SchoolInactivePage = page(() => import("./SchoolInactivePage"), "SchoolInactivePage");

/** Public and account-state routes. `/signup` is the Hanbee staff application;
 *  schools register at `/register-school`; students join at `/join/:token`;
 *  personal invitations (solo student, co-staff, manager-created staff) use
 *  `/accept-invite?token=...`. */
export const authRoutes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/register-school", element: <RegisterSchoolPage /> },
  { path: "/join/:token", element: <JoinSchoolPage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },
  { path: "/setup", element: <ManagerSetupPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/pending-approval", element: <PendingApprovalPage /> },
  { path: "/account-suspended", element: <AccountSuspendedPage /> },
  { path: "/school-inactive", element: <SchoolInactivePage /> },
];
