import { test, expect } from "@playwright/test";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("switching to Dark sets data-theme and persists across reload", async ({ page }) => {
  await loginAsStaff(page);

  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("switching to Light then System toggles the attribute correctly", async ({ page }) => {
  await loginAsStaff(page);

  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("menuitem", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("menuitem", { name: "System" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("dark mode repaints the app — page background is a dark color, not white", async ({ page }) => {
  await loginAsStaff(page);

  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();

  // Normalize via a canvas 2D context so this works regardless of whether
  // the browser serializes the computed color as rgb() or oklch().
  const [r, g, b] = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  });
  // A dark oklch(0.16 ...) background should resolve to low RGB channel values.
  expect(r).toBeLessThan(80);
  expect(g).toBeLessThan(80);
  expect(b).toBeLessThan(80);
});
