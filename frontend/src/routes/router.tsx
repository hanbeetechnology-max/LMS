import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";
import { authRoutes } from "../portal/auth/routes";
import { studentRoutes } from "../portal/student/routes";
import { schoolRoutes } from "../portal/school/routes";
import { hanbeeRoutes } from "../portal/hanbee/routes";
import { managerRoutes } from "../portal/manager/routes";

// Every page is code-split via React.lazy so a first visit only downloads the
// JS it needs. The Suspense fallback is wired in main.tsx around
// <RouterProvider>. Each role's routes (and their guards and layouts) live in
// src/portal/<role>/routes.tsx; this file only composes them. Route map and
// ownership: docs/FRONTEND_CONTRACT.md.
const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const NotAuthorizedPage = lazy(() => import("../pages/NotAuthorizedPage").then((m) => ({ default: m.NotAuthorizedPage })));
const ApplyPage = lazy(() => import("../pages/ApplyPage").then((m) => ({ default: m.ApplyPage })));
const TournamentPage = lazy(() => import("../pages/TournamentPage").then((m) => ({ default: m.TournamentPage })));
const VerifyCertificatePage = lazy(() => import("../pages/VerifyCertificatePage").then((m) => ({ default: m.VerifyCertificatePage })));
const AboutPage = lazy(() => import("../pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("../pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import("../pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("../pages/TermsPage").then((m) => ({ default: m.TermsPage })));

// Dev-only: exercises RouteErrorBoundary. import.meta.env.DEV is resolved
// statically by Vite, so this route is stripped from production builds.
const DevCrashTestPage = import.meta.env.DEV
  ? lazy(() => import("../pages/DevCrashTestPage").then((m) => ({ default: m.DevCrashTestPage })))
  : null;

export const router = createBrowserRouter([
  {
    // Pathless root route: its errorElement catches render/loader/action
    // errors from every route below.
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <LandingPage /> },
      ...(DevCrashTestPage ? [{ path: "/__dev/crash-test", element: <DevCrashTestPage /> }] : []),
      ...authRoutes,
      { path: "/not-authorized", element: <NotAuthorizedPage /> },
      { path: "/apply", element: <ApplyPage /> },
      { path: "/tournament", element: <TournamentPage /> },
      { path: "/verify/:certificateId", element: <VerifyCertificatePage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
      studentRoutes,
      schoolRoutes,
      hanbeeRoutes,
      managerRoutes,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
