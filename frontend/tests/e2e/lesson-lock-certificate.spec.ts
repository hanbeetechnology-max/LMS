import { test, expect } from "@playwright/test";
import { resetAvaLessonProgress } from "./_realStudentProgress";

async function loginAsStudent(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/rc$/);
}

// Since docs/PLAN.md §10.44 Phase 1, this reads the real, live
// lesson_completions/lessons rows for the seeded "Intro to Design" course
// (ava@student.edu has a real enrollment in it — see supabase/seed.mjs) —
// not the old hardcoded LESSONS mock array. Only 3 of its 5 seeded lessons
// are published ("Welcome & syllabus", "Color Theory", "Type pairing"), so
// those are what a student actually sees and locks against; ids are real
// Supabase uuids, not the old "l1".."l5" mock ids, so navigation here goes
// by title/link-click, not a hardcoded URL.
//
// All tests that touch ava's real progress are grouped here in one
// `serial` describe block (not split across files) — with real, shared DB
// state instead of the old per-browser-context sessionStorage mock, two
// files running in separate parallel Playwright workers were racing on the
// same account's completions, causing flaky "still locked" failures. Serial
// mode guarantees these run one after another on a single worker; each
// still resets first so ordering between them doesn't matter either.
test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await resetAvaLessonProgress();
});

test("later lessons stay locked until earlier ones are marked complete", async ({ page }) => {
  await loginAsStudent(page);

  // "l1" is a placeholder entry id that no longer matches any real lesson —
  // StudentLessonViewerPage treats an unrecognized id as "start of course."
  await page.goto("/student/courses/1/lessons/l1");
  await expect(page.getByRole("heading", { name: "Welcome & syllabus" })).toBeVisible();

  // The "next" footer link is a locked label, not a real link, until this
  // lesson is marked complete.
  await expect(page.getByRole("link", { name: /Color Theory →/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByRole("link", { name: /Color Theory →/ })).toBeVisible();

  await page.getByRole("link", { name: /Color Theory →/ }).click();
  await expect(page.getByRole("heading", { name: "Color Theory" })).toBeVisible();

  // Color Theory isn't complete yet, so its own "next" is still locked.
  await expect(page.getByRole("link", { name: /Type pairing →/ })).toHaveCount(0);
});

test("certificate becomes available once every lesson is complete, and prints without app chrome", async ({ page }) => {
  await loginAsStudent(page);
  await page.goto("/student/courses/1/lessons/l1");

  for (const title of ["Color Theory", "Type pairing"]) {
    await page.getByRole("button", { name: "Mark complete" }).click();
    const next = page.getByRole("link", { name: /→$/ });
    // Wait for the unlocked link to actually render before clicking it —
    // otherwise the click can race the completion state update and land on
    // the previous (still-locked) render, which bounces back via the
    // sequential-lock redirect instead of advancing.
    await expect(next).toBeVisible();
    await next.click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }
  // Now on the last published lesson (Type pairing) — mark it complete too.
  await page.getByRole("button", { name: "Mark complete" }).click();

  await expect(page.getByRole("link", { name: "View certificate" })).toBeVisible();
  await page.getByRole("link", { name: "View certificate" }).click();
  await expect(page).toHaveURL(/\/student\/courses\/1\/certificate$/);
  await expect(page.getByText("Certificate of Completion")).toBeVisible();
  await expect(page.getByText("Intro to Design")).toBeVisible();

  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
});

test("completing a course issues a real, verifiable certificate", async ({ page }) => {
  await loginAsStudent(page);

  await page.goto("/student/courses/1/lessons/l1");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Mark complete" }).click();
    if (i < 2) {
      const next = page.getByRole("link", { name: /→$/ });
      await expect(next).toBeVisible();
      await next.click();
    }
  }

  await page.getByRole("link", { name: "View certificate" }).click();
  await expect(page).toHaveURL(/\/student\/courses\/1\/certificate$/);
  await expect(page.getByText("Certificate of Completion")).toBeVisible();
  await expect(page.getByText(/Verified record/)).toBeVisible();

  const verifyLink = page.getByRole("link", { name: /hanbeelms\.com\/verify\// });
  const href = await verifyLink.getAttribute("href");
  expect(href).toMatch(/^\/verify\/.+$/);

  // A separate, unauthenticated browser context can independently confirm
  // this certificate — that's the whole point of it being public.
  const anonPage = await (await page.context().browser()!.newContext()).newPage();
  await anonPage.goto(href!);
  await expect(anonPage.getByText("Verified")).toBeVisible();
  await expect(anonPage.getByText("Ava Chen")).toBeVisible();
  await expect(anonPage.getByText("Intro to Design")).toBeVisible();
});
