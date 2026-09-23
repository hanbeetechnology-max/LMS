import { test, expect } from "@playwright/test";

async function loginAsManager(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan@hanbeelms.edu");
  await page.getByLabel("Password").fill("manager123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/manager\/dashboard$/);
}

test("staff rollup shows the first staff member's time log by default, and switches on picker click", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/staff");

  await expect(page.getByText("Instructor — Intro to Design, Data Structures")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Time log" })).toBeVisible();
  await expect(page.getByText("9:02 AM")).toBeVisible();

  await page.getByRole("button", { name: "Devika Rao" }).click();
  await expect(page.getByText("Instructor — UX Writing Basics")).toBeVisible();
  await expect(page.getByText("88%")).toBeVisible();
});
