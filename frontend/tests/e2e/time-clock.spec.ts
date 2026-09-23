import { test, expect } from "@playwright/test";

test("time clock widget: clock in, take a break, end it, clock out — each step toasts", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await expect(page.getByText("Not clocked in")).toBeVisible();

  await page.getByRole("button", { name: "Clock in" }).click();
  await expect(page.getByText(/^Clocked in at/).first()).toBeVisible();

  await page.getByRole("button", { name: "Start break" }).click();
  await expect(page.getByText(/On a break since/)).toBeVisible();
  await expect(page.getByText(/Break started at/)).toBeVisible();

  await page.getByRole("button", { name: "End break" }).click();
  await expect(page.getByText("Break ended.")).toBeVisible();

  await page.getByRole("button", { name: "Clock out" }).click();
  await expect(page.getByText(/Clocked out — worked/)).toBeVisible();
  await expect(page.getByText("Not clocked in")).toBeVisible();
});
