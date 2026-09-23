import { test, expect } from "@playwright/test";

async function loginAsManager(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan@hanbeelms.edu");
  await page.getByLabel("Password").fill("manager123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/manager\/dashboard$/);
}

test("adding a center-wide holiday shows it on the calendar and in the day detail", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/holidays");

  // Pick an empty day cell (the 10th of whichever month is showing).
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByPlaceholder("Holiday name").fill("Community Service Day");
  await page.getByRole("button", { name: "Add holiday" }).click();

  await expect(page.getByText('"Community Service Day" added.')).toBeVisible();
  await expect(page.locator("li", { hasText: "Community Service Day" })).toBeVisible();
});

test("a staff holiday with 'also close sections' checked creates a matching student closure", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/holidays");

  await page.getByRole("button", { name: "12", exact: true }).click();
  await page.getByPlaceholder("Holiday name").fill("Staff Retreat");
  await page.getByLabel("Scope").selectOption("staff");
  await page.getByLabel("Also close affected sections for students on this day").check();
  await page.getByRole("button", { name: "Add holiday" }).click();

  await expect(page.getByText('"Staff Retreat" added — affected sections closed for students too.')).toBeVisible();

  // Switch to the Students tab and confirm the cascaded closure shows there too.
  await page.getByRole("button", { name: "Students Holidays" }).click();
  await page.getByRole("button", { name: "12", exact: true }).click();
  await expect(page.getByText("Staff Retreat (sections closed)")).toBeVisible();
});

test("the day detail panel has a visible close button that deselects the day", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/holidays");

  await page.getByRole("button", { name: "25", exact: true }).click();
  await expect(page.getByText("Founders' Day")).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Founders' Day")).toHaveCount(0);
  await expect(page.getByPlaceholder("Holiday name")).toHaveCount(0);
});

test("removing a holiday takes it off the day", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/holidays");

  // Founders' Day is seeded on the 25th and is center-wide, so it's visible
  // on both tabs without needing to navigate months (seeded for Sep 2026).
  await page.getByRole("button", { name: "25", exact: true }).click();
  await expect(page.getByText("Founders' Day")).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();

  await expect(page.getByText('"Founders\' Day" removed.')).toBeVisible();
  await expect(page.getByText("Founders' Day")).toHaveCount(0);
});
