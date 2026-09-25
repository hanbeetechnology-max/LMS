import { test, expect, type Page } from "@playwright/test";
import { resetAvaLessonProgress } from "./_realStudentProgress";
import { ensureColorTheoryAssessment, resetSubmissionToPending, backdateAutoUnlock } from "./_realAssessment";

// Real, end-to-end coverage for the assessment submit -> pending ->
// verify/auto-unlock flow (docs/PLAN.md §10.44 Phase 3), which until now
// was only validated via pglite scripts, never through a real browser
// against real Supabase RLS/RPCs. Uses the seeded "Color Theory" video
// lesson in the "Intro to Design" course (the only seeded lesson an
// assessment can be attached to — AssessmentEditor only enables the
// knowledge-check UI for video lessons) and the same real student/staff
// accounts and reset-before-test conventions as lesson-lock-certificate.spec.ts
// and _realStudentProgress.ts.
//
// All three scenarios share one real assessment row (unique per
// assessment_id+enrollment_id), so they must run in a fixed order on one
// worker — same "serial, shared account" reasoning as
// lesson-lock-certificate.spec.ts.
test.describe.configure({ mode: "serial" });

async function loginAsStudent(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/rc$/);
}

async function loginAsStaff(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/my-space$/);
  // Quiz submissions waiting for review live on the LMS overview.
  await page.goto("/staff/lms");
}

/**
 * Advances to "Color Theory", the video lesson with the knowledge check —
 * marking "Welcome & syllabus" complete first only if it isn't already
 * (real completions persist across these serial tests' shared account, so
 * only the first test in the file needs to do this step).
 */
async function gotoColorTheoryLesson(page: Page) {
  await page.goto("/student/courses/1/lessons/l1");
  await expect(page.getByRole("heading", { name: "Welcome & syllabus" })).toBeVisible();
  const nextLink = page.getByRole("link", { name: /Color Theory →/ });
  if ((await nextLink.count()) === 0) {
    await page.getByRole("button", { name: "Mark complete" }).click();
  }
  await expect(nextLink).toBeVisible();
  await nextLink.click();
  await expect(page.getByRole("heading", { name: "Color Theory" })).toBeVisible();
}

test("student submits a knowledge check and lands in pending verification, even with a wrong answer", async ({ page }) => {
  const { assessmentId, enrollmentId } = await ensureColorTheoryAssessment();
  await resetAvaLessonProgress();
  await loginAsStudent(page);
  await gotoColorTheoryLesson(page);

  await expect(page.getByRole("heading", { name: "Color Theory check" })).toBeVisible();

  const submitButton = page.getByRole("button", { name: "Submit knowledge check" });
  if (await submitButton.count()) {
    // First run against a fresh assessment/enrollment pair (the unique
    // constraint on assessment_submissions means this row can only ever be
    // *created* once, and there's deliberately no student-facing way to
    // resubmit once a submission exists — by design, per StudentAssessment's
    // fieldset — so this branch only actually runs the first time the suite
    // touches this pair). Deliberately answer wrong — migration
    // 0008_assessment_verification_fix.sql's whole point is that a
    // submission reaches the review queue and stays reviewable regardless
    // of score; it must never insert as immediately "failed" and invisible
    // to staff (the bug 0007 originally had).
    await page.getByLabel("Brown").check();
    await submitButton.click();
  } else {
    // A submission already exists from a previous run of this suite —
    // there's no DELETE policy on assessment_submissions (by design: only
    // the security-definer submit_assessment RPC can create a row), so
    // re-stage it back to "just submitted, pending" via the same
    // staff-authorized UPDATE the SLA test uses, then reload to see it
    // render fresh, still exercising the real pending/not-unlocked render
    // path end to end.
    await resetSubmissionToPending(assessmentId, enrollmentId);
    await page.reload();
  }

  await expect(page.getByText(/staff member is reviewing this/i)).toBeVisible();
  // Not unlocked yet — the lesson can't be marked complete until verified
  // or the SLA elapses.
  const markComplete = page.getByRole("button", { name: "Mark complete" });
  await expect(markComplete).toBeVisible();
  await expect(markComplete).toBeDisabled();
});

test("staff verifies the pending submission in AssessmentReviewPanel, which unlocks the student's next lesson", async ({ page, browser }) => {
  const staffPage = await (await browser.newContext()).newPage();
  await loginAsStaff(staffPage);
  const reviewSection = staffPage.locator("section").filter({ hasText: "Assessment review" });
  await expect(reviewSection.getByText("Color Theory check")).toBeVisible();
  await reviewSection.getByRole("button", { name: "Verify" }).click();
  await expect(reviewSection.getByText("Color Theory check")).toHaveCount(0);
  await staffPage.close();

  await loginAsStudent(page);
  await gotoColorTheoryLesson(page);

  await expect(page.getByText(/Unlocked — you can continue/i)).toBeVisible();
  const markComplete = page.getByRole("button", { name: "Mark complete" });
  await expect(markComplete).toBeEnabled();
  await markComplete.click();
  await expect(page.getByRole("link", { name: /Type pairing →/ })).toBeVisible();
});

test("the 10-minute SLA auto-unlocks the lesson with no staff action", async ({ page }) => {
  const { assessmentId, enrollmentId } = await ensureColorTheoryAssessment();
  // Re-stage the same row as a fresh pending submission (see
  // _realAssessment.ts for why this is a legitimate staff-authorized UPDATE
  // rather than a fake shortcut), then backdate auto_unlock_at the same way
  // the existing pglite test simulates the SLA — 11 minutes in the past, so
  // assessment_submissions_effective's `now() >= auto_unlock_at` unlock
  // condition is genuinely true, not staff-verified.
  await resetSubmissionToPending(assessmentId, enrollmentId);
  await backdateAutoUnlock(assessmentId, enrollmentId, 11);

  await loginAsStudent(page);
  await gotoColorTheoryLesson(page);

  // Status still reads "pending" in the DB (never touched by a staff
  // member), yet the lesson is unlocked purely because the SLA elapsed.
  await expect(page.getByText(/Unlocked — you can continue/i)).toBeVisible();
  // This lesson was already marked complete in the previous test, so the
  // button now reads "✓ Completed" rather than "Mark complete" — either
  // way, the meaningful assertion is that it's not gated/disabled by the
  // (still-pending, staff-untouched) assessment.
  const completeButton = page.getByRole("button", { name: /Mark complete|Completed/ });
  await expect(completeButton).toBeEnabled();
});
