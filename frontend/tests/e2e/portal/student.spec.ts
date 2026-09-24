import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Demo#12345";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/student\/rc/, { timeout: 20_000 });
}

test.describe("student portal", () => {
  test("school student: tournament first, switching, overview, leaderboard, LMS", async ({ page }) => {
    await login(page, "demo.s1@hanbee.test");
    await expect(page).toHaveURL(/\/student\/rc$/);

    const tabs = page.getByRole("tab");
    await expect(tabs.nth(0)).toHaveText("Tournament");
    await expect(tabs.nth(1)).toHaveText("Learning");

    await expect(page.getByText("Hanbee RC Cup 2026").first()).toBeVisible();
    await expect(page.getByText("Alpha Racers").first()).toBeVisible();
    await expect(page.getByText("Verified by HANBEE").first()).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();

    await page.goto("/student/rc/leaderboard");
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toContainText("Alpha Racers");
    await expect(firstRow).toContainText("Your team");

    await page.getByRole("tab", { name: "Learning" }).click();
    await expect(page).toHaveURL(/\/student\/lms$/);
    await expect(page.getByText(/\d+%/).first()).toBeVisible();
    await expect(page.getByText("Intro to Design").first()).toBeVisible();

    await page.getByRole("tab", { name: "Tournament" }).click();
    await expect(page).toHaveURL(/\/student\/rc$/);
  });

  test("other school student sees own team only", async ({ page }) => {
    await login(page, "demo.t1@hanbee.test");
    await expect(page.getByText("Sample Speed").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alpha Racers" })).toHaveCount(0);
    await expect(page.locator("main").getByText("Alpha Racers").first()).toBeVisible(); // top three may list it
  });

  test("solo student sees team-of-one flow", async ({ page }) => {
    await login(page, "demo.solo@hanbee.test");
    await page.goto("/student/rc/team");
    await expect(page.getByRole("button", { name: "Enter as a team of one" })).toBeVisible();
  });

  test("mobile keeps the switcher visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "demo.s1@hanbee.test");
    await expect(page.getByRole("tab", { name: "Tournament" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Learning" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test("student cannot open the school area", async ({ page }) => {
    await login(page, "demo.s1@hanbee.test");
    await page.goto("/school/overview");
    await expect(page).toHaveURL(/not-authorized/);
  });
});
