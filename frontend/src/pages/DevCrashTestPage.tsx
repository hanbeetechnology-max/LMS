/**
 * Dev-only route for exercising the top-level ErrorBoundary (see
 * frontend/tests/e2e/error-boundary.spec.ts). Only registered in router.tsx
 * when import.meta.env.DEV is true, which Vite resolves statically at build
 * time — this file is dead-code-eliminated from production builds.
 */
export function DevCrashTestPage(): never {
  throw new Error("Intentional crash from /__dev/crash-test for ErrorBoundary testing.");
}
