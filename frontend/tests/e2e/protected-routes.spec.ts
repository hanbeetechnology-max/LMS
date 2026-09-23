import { test, expect, type Page } from "@playwright/test";

const STAFF = { email: "jamie@hanbeelms.edu", password: "staff123" };
const STUDENT = { email: "ava@student.edu", password: "student123" };

async function loginAs(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(staff|student)\/dashboard$/);
}

test.describe("protected routes", () => {
  test("visiting a staff route while signed out redirects to /login", async ({ page }) => {
    await page.goto("/staff/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("visiting a student route while signed out redirects to /login", async ({ page }) => {
    await page.goto("/student/attendance");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a staff session visiting a student route is redirected to /not-authorized", async ({ page }) => {
    await loginAs(page, STAFF);
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/not-authorized$/);
    await expect(page.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
  });

  test("a student session visiting a staff route is redirected to /not-authorized", async ({ page }) => {
    await loginAs(page, STUDENT);
    await page.goto("/staff/dashboard");
    await expect(page).toHaveURL(/\/not-authorized$/);
  });

  test("signing out clears the session and re-blocks protected routes", async ({ page }) => {
    await loginAs(page, STAFF);

    await page.getByRole("button", { name: /Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/staff/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a signed-in staff session persists across a reload", async ({ page }) => {
    await loginAs(page, STAFF);
    await page.reload();
    await expect(page).toHaveURL(/\/staff\/dashboard$/);
  });
});
