import { test, expect } from "@playwright/test";

const STAFF = { email: "jamie@hanbeelms.edu", password: "staff123" };

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(STAFF.email);
  await page.getByLabel("Password").fill(STAFF.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("Escape closes the profile menu and returns focus to its trigger", async ({ page }) => {
  await loginAsStaff(page);

  const trigger = page.getByRole("button", { name: /Account menu/ });
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("Escape closes a roster row's action menu and returns focus to its trigger", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");

  const trigger = page.getByRole("button", { name: /Actions for/ }).first();
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("Escape clears the global search query", async ({ page }) => {
  await loginAsStaff(page);

  const search = page.getByPlaceholder("Search…");
  await search.fill("roster");
  await expect(page.getByRole("listbox")).toBeVisible();

  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(page.getByRole("listbox")).toBeHidden();
});
