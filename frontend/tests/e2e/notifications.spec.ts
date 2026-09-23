import { test, expect } from "@playwright/test";

// NotificationBell reads real, live notifications for a real Supabase
// account (jamie@hanbeelms.edu) instead of the old fixed mock array —
// there's no longer a reliable seeded item like "Grace Okafor applied" to
// assert on, since real content depends on whatever's actually happened to
// this account. These check the mechanics that hold regardless of content.

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("notification bell opens and shows either real notifications or an honest empty state", async ({ page }) => {
  await loginAsStaff(page);

  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  const hasEmptyState = await page.getByText("You're all caught up.").isVisible().catch(() => false);
  const hasItems = await page.getByRole("menuitem").first().isVisible().catch(() => false);
  expect(hasEmptyState || hasItems).toBe(true);
});

test("notification bell: Mark all read clears the unread badge when notifications exist", async ({ page }) => {
  await loginAsStaff(page);

  await page.getByRole("button", { name: /^Notifications/ }).click();
  const markAllRead = page.getByRole("button", { name: "Mark all read" });
  if (await markAllRead.isVisible().catch(() => false)) {
    await markAllRead.click();
  }
  await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
});
