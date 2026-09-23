import { test, expect } from "@playwright/test";

const STAFF = { email: "jamie@hanbeelms.edu", password: "staff123" };

test("forum thread moderation controls stack below the title at mobile width, not overlapping it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/login");
  await page.getByLabel("Email").fill(STAFF.email);
  await page.getByLabel("Password").fill(STAFF.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/forums");
  await page.getByRole("button", { name: /Welcome/ }).click();

  const title = page.getByRole("heading", { name: /Welcome/ });
  const pinButton = page.getByRole("button", { name: "Pinned" });
  await expect(title).toBeVisible();
  await expect(pinButton).toBeVisible();

  const titleBox = await title.boundingBox();
  const pinBox = await pinButton.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(pinBox).not.toBeNull();
  // The moderation button row must sit entirely below the (possibly
  // multi-line) title, not beside/overlapping it at narrow widths.
  expect(pinBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height - 1);
});
