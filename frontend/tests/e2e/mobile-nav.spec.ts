import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile sidebar has a visible close button and closes on Escape, restoring focus", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  const openButton = page.getByRole("button", { name: "Open menu" });
  const sidebar = page.locator("aside");

  // The sidebar is a slide-out drawer (kept in the DOM, translated off-screen
  // for the animation), so "closed" is an off-screen position, not
  // display:none/hidden — assert via bounding box x rather than visibility.
  async function sidebarX() {
    const box = await sidebar.boundingBox();
    return box!.x;
  }

  await openButton.click();
  const closeButton = page.getByRole("button", { name: "Close menu" });
  await expect(closeButton).toBeVisible();
  await expect.poll(sidebarX).toBeGreaterThanOrEqual(0);

  await closeButton.click();
  await expect.poll(sidebarX).toBeLessThan(0);

  // Reopen and confirm Escape also closes it and returns focus to the trigger.
  await openButton.click();
  await expect.poll(sidebarX).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Escape");
  await expect.poll(sidebarX).toBeLessThan(0);
  await expect(openButton).toBeFocused();
});
