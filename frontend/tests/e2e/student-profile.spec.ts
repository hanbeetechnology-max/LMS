import { test, expect } from "@playwright/test";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("clicking a student in the roster opens their profile with the right stats", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");

  await page.getByRole("link", { name: /Ava Chen/ }).click();

  await expect(page).toHaveURL(/\/staff\/students\/1$/);
  await expect(page.getByRole("heading", { name: "Ava Chen" })).toBeVisible();
  await expect(page.getByText("ava@student.edu")).toBeVisible();
  await expect(page.getByText("Intro to Design — Section B")).toBeVisible();
  await expect(page.getByText("Welcome & syllabus")).toBeVisible();
  await expect(page.getByText("✓ Complete").first()).toBeVisible();
});

test("saving a staff note shows a confirming toast", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/students/1");

  await page.getByPlaceholder("Add a note about this student…").fill("Doing great this term.");
  await page.getByRole("button", { name: "Save note" }).click();

  await expect(page.getByText("Notes saved.")).toBeVisible();
});

test("a student with no attendance history shows an empty state, not a blank list", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/students/4");

  await expect(page.getByRole("heading", { name: "Sofia Kim" })).toBeVisible();
  await expect(page.getByText("No attendance recorded yet.")).toBeVisible();
});
