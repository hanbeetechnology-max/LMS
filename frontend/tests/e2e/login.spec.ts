import { test, expect } from "@playwright/test";

const STAFF = { email: "jamie@hanbeelms.edu", password: "staff123" };
const STUDENT = { email: "ava@student.edu", password: "student123" };

test.describe("login", () => {
  test("staff demo account signs in and lands on the staff dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STAFF.email);
    await page.getByLabel("Password").fill(STAFF.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/staff\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Jamie/ })).toBeVisible();
  });

  test("student demo account signs in and lands on the student dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STUDENT.email);
    await page.getByLabel("Password").fill(STUDENT.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Ava/ })).toBeVisible();
  });

  test("wrong password shows a generic invalid-credentials error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STAFF.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
    await expect(page).toHaveURL(/\/login$/);
  });

  // The one-click demo-account list only ever made sense before a real
  // backend existed — exposing real, working credentials (including the
  // seeded manager account) on a public login page is a real hole once a
  // backend is actually connected, so LoginPage.tsx hides it entirely
  // whenever Supabase is configured (see docs/PLAN.md §10.38's finding).
  // This environment always has Supabase configured, so the honest
  // assertion is that the box is gone, not that it still works.
  test("the demo-account quick-fill list is hidden once a real backend is connected", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Demo accounts")).toHaveCount(0);
    await expect(page.getByText(STAFF.email)).toHaveCount(0);
  });

  test("login page links to all three real signup paths", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /Staff — create an account/ })).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("link", { name: /Student — apply to a course/ })).toHaveAttribute("href", "/apply");
    await expect(page.getByRole("link", { name: /Manager — set up your organization/ })).toHaveAttribute("href", "/setup");
  });
});
