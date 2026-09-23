import { test, expect } from "@playwright/test";

// The "completing a course issues a real, verifiable certificate" test
// used to live here, but now shares ava@student.edu's real, live
// lesson_completions state with lesson-lock-certificate.spec.ts (since
// docs/PLAN.md §10.44 Phase 1 moved StudentLessonViewerPage off mock/
// sessionStorage onto that real data) — two files running in separate
// parallel workers were racing on the same account's progress. Moved into
// that file's single `serial` describe block so nothing else touches ava's
// progress concurrently; this file keeps only what doesn't depend on it.
test("an unknown certificate id shows a not-found message, not a crash", async ({ page }) => {
  await page.goto("/verify/cert_does_not_exist");
  await expect(page.getByText("Certificate not found")).toBeVisible();
});
