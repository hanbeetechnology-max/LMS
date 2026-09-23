import { test, expect } from "@playwright/test";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("roster: editing a section's capacity persists in the panel", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");

  await page.getByRole("button", { name: "Manage sections" }).click();
  const row = page.getByTestId("section-row-Data Structures");
  const capacityInput = row.locator("input[type=number]");
  await capacityInput.fill("60");
  await expect(capacityInput).toHaveValue("60");
});

test("roster: adding a new section makes it a selectable tab with zero students", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");

  await page.getByRole("button", { name: "Manage sections" }).click();
  await page.getByPlaceholder("e.g. Data Structures — Evening").fill("Data Structures — Evening");
  await page.getByRole("button", { name: "Add section" }).click();

  await expect(page.getByText('Section "Data Structures — Evening" created.')).toBeVisible();
  await page.getByRole("button", { name: "Data Structures — Evening" }).click();
  await expect(page.getByText("No students enrolled in this section yet.")).toBeVisible();
});

test("roster: a section with students can't be deleted, an empty one can", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");

  await page.getByRole("button", { name: "Manage sections" }).click();
  const populatedRow = page.getByTestId("section-row-Data Structures");
  await expect(populatedRow.getByRole("button", { name: "Delete" })).toBeDisabled();

  await page.getByPlaceholder("e.g. Data Structures — Evening").fill("Temp Section");
  await page.getByRole("button", { name: "Add section" }).click();
  const tempRow = page.getByTestId("section-row-Temp Section");
  await tempRow.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText('Section "Temp Section" deleted.')).toBeVisible();
  await expect(page.getByRole("button", { name: "Temp Section" })).toHaveCount(0);
});
