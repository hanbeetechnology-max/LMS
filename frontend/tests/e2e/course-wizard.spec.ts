import { test, expect } from "@playwright/test";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("full course wizard: details → type → seeded first module lands in the editor", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/courses/new");

  // Step 1: details
  await page.getByLabel("Title").fill("Intro to Robotics");
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 2: type
  await expect(page.getByRole("heading", { name: "Choose a type" })).toBeVisible();
  await page.getByRole("button", { name: /Video course/ }).click();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 3: first module (not skipped)
  await expect(page.getByRole("heading", { name: "Add a first module" })).toBeVisible();
  await page.getByLabel("First lesson title").fill("Welcome to Robotics");
  await page.getByRole("button", { name: "Create course" }).click();

  await expect(page).toHaveURL(/\/staff\/courses\/.+\/edit$/);
  await expect(page.getByRole("textbox").first()).toHaveValue("Intro to Robotics");
  await expect(page.getByText("Welcome to Robotics")).toBeVisible();
  // Video type's default content type chip should be pre-selected. (The
  // "Video course" wizard-step label itself isn't persisted anywhere in the
  // real schema — courses has no `type` column, only `content_type` per
  // lesson — so it no longer renders once the editor loads real data back
  // from Supabase instead of the ephemeral router state that used to carry
  // it; see docs/PLAN.md §10.44.)
  await expect(page.getByRole("button", { name: "Video" })).toHaveClass(/bg-\(--color-violet\)/);
});

test("course wizard step 3 can be skipped, landing on an empty editor", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/courses/new");

  await page.getByLabel("Title").fill("Untitled Skip Test");
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Create course" }).click();

  await expect(page).toHaveURL(/\/staff\/courses\/.+\/edit$/);
  await expect(page.getByRole("textbox").first()).toHaveValue("Untitled Skip Test");
  await expect(page.getByText("Select a lesson to edit its content.")).toBeVisible();
});
