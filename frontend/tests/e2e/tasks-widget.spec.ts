import { test, expect } from "@playwright/test";

test("tasks widget: add, complete, and delete a task", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await expect(page.getByText("3 open")).toBeVisible();

  await page.getByPlaceholder("Add a task…").fill("Email the new TA");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Email the new TA")).toBeVisible();
  await expect(page.getByText("4 open")).toBeVisible();

  const taskRow = page.locator("li", { hasText: "Email the new TA" });
  await taskRow.getByRole("checkbox").check();
  await expect(page.getByText('Completed "Email the new TA".')).toBeVisible();
  await expect(page.getByText("3 open")).toBeVisible();

  await taskRow.getByRole("button", { name: "Delete Email the new TA" }).click();
  await expect(page.getByText("Email the new TA")).toHaveCount(0);
});
