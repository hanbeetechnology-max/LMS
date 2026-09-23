import { test, expect } from "@playwright/test";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("apply page: submitting the form shows a confirming panel naming the chosen course", async ({ page }) => {
  await page.goto("/apply");

  // The apply page now lists real, live-published Supabase courses (see
  // fetchPublishedCourses in src/lib/coursesApi.ts) instead of the old
  // hardcoded "Data Structures"/"Intro to Design" mock pair — today only
  // "Intro to Design" is seeded as published, so that's the one available
  // to select here.
  await page.getByRole("button", { name: /Intro to Design/ }).click();
  await page.getByLabel("Full name").fill("Jordan Lee");
  await page.getByLabel("Email").fill("jordan.lee@example.com");
  await page.getByRole("button", { name: "Apply now" }).click();

  await expect(page.getByRole("heading", { name: "Thanks — we've got it" })).toBeVisible();
  await expect(page.getByText("Intro to Design")).toBeVisible();
  await expect(page.getByText("jordan.lee@example.com")).toBeVisible();
});

test("apply page: submitting without a name or email shows inline validation errors", async ({ page }) => {
  await page.goto("/apply");

  await page.getByRole("button", { name: "Apply now" }).click();

  await expect(page.getByText("Full name is required")).toBeVisible();
  await expect(page.getByText("Email is required")).toBeVisible();
});

test("staff inquiries: seeded applications show, and Invite prefills the invitations form", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/inquiries");

  await expect(page.getByText("Grace Okafor")).toBeVisible();

  await page.getByRole("button", { name: "Invite" }).first().click();

  await expect(page).toHaveURL(/\/staff\/invitations$/);
  await expect(page.getByLabel("Student emails")).toHaveValue("grace.okafor@example.com");
});
