import { test, expect } from "@playwright/test";

test("deleting every discussion thread shows a real empty state, not a blank box", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/forums");

  for (const title of ["Welcome", "Question about", "Midterm project"]) {
    await page.locator("button", { hasText: title }).first().click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("button", { hasText: title })).toHaveCount(0);
  }

  await expect(page.getByText("No discussions yet. Start the first thread.")).toBeVisible();
});
