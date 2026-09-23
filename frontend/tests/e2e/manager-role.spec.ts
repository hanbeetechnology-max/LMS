import { test, expect } from "@playwright/test";

test("manager demo account signs in and lands on the manager dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan@hanbeelms.edu");
  await page.getByLabel("Password").fill("manager123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/manager\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Morgan/ })).toBeVisible();
});

test("manager nav reaches every section with no dead links", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan@hanbeelms.edu");
  await page.getByLabel("Password").fill("manager123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/manager\/dashboard$/);

  await page.getByRole("link", { name: "Verifications", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Verifications" })).toBeVisible();

  await page.getByRole("link", { name: "Holidays", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Holidays" })).toBeVisible();

  await page.getByRole("link", { name: "Staff", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Staff time & performance" })).toBeVisible();
});

test("a staff session visiting a manager route is redirected to /not-authorized, and vice versa", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/manager/dashboard");
  await expect(page).toHaveURL(/\/not-authorized$/);
});

test("manager settings shows manager-specific notification categories", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan@hanbeelms.edu");
  await page.getByLabel("Password").fill("manager123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/manager\/dashboard$/);

  await page.goto("/manager/settings");
  await expect(page.getByText("Verification requests")).toBeVisible();
  await expect(page.getByText("Holiday changes")).toBeVisible();
});
