import { test, expect } from "@playwright/test";

test("staff courses: category filter narrows the list", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/courses");
  await page.getByRole("button", { name: "Math" }).click();

  await expect(page.getByText("Intro to Statistics — Fall 2025")).toBeVisible();
  await expect(page.getByText("Intro to Design", { exact: true })).toHaveCount(0);
});

test("student courses: category filter narrows the list", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);

  // Student courses now come from real, live-published Supabase courses
  // (see fetchPublishedCourses in src/lib/coursesApi.ts) instead of the old
  // hardcoded mock array with Design/Math/Computer Science categories. The
  // DB `courses` table has no category column, so real rows fall back to a
  // single "General" category — only "Intro to Design" is seeded as
  // published today, so that's the only course/category to filter by.
  await page.goto("/student/courses");
  await page.getByRole("button", { name: "General" }).click();

  await expect(page.getByText("Intro to Design")).toBeVisible();
  await expect(page.getByText("Data Structures")).toHaveCount(0);
});

test("roster: searching finds a student across sections and shows their section", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/roster");
  // Priya Nair is enrolled in Data Structures, while the roster defaults to
  // "Intro to Design — Section B" — a plain per-tab search would find nothing.
  await page.getByPlaceholder("Search all sections…").fill("Priya");

  await expect(page.getByText("Searching all sections")).toBeVisible();
  const row = page.locator("div", { hasText: "Priya Nair" }).last();
  await expect(row.getByText("Data Structures", { exact: true })).toBeVisible();
});

test("roster: at mobile width, row action menu is a real touch target and student names stay visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/roster");
  await expect(page.getByText("Ava Chen")).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

  const menuTrigger = page.getByRole("button", { name: "Actions for Ava Chen" });
  const box = await menuTrigger.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(40);
  expect(box?.height).toBeGreaterThanOrEqual(40);
});

test("roster: Export CSV downloads a file with the visible rows", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/roster");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  await expect(page.getByText("Exported 5 students to CSV.")).toBeVisible();
});
