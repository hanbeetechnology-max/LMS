import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}
const staff = (p: Page) => login(p, "jamie@hanbeelms.edu", "staff123");
const manager = (p: Page) => login(p, "morgan@hanbeelms.edu", "manager123");
const noSideScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

test.describe("Staff attendance", () => {
  test("staff sees stats, rule line, day table and today as a holiday", async ({ page }) => {
    await staff(page);
    await page.getByRole("link", { name: "Attendance" }).first().click();
    await expect(page).toHaveURL(/\/staff\/attendance$/);
    const stats = page.getByTestId("attendance-stats");
    for (const l of ["Days present", "Late days", "Absent days", "Total hours", "Avg per worked day"]) await expect(stats.getByText(l)).toBeVisible();
    await expect(page.getByTestId("work-rule")).toContainText(/Work starts \d\d:\d\d, \d+ min grace/);
    const table = page.getByTestId("attendance-table");
    await expect(table).toBeVisible();
    // Today is a holiday; if Jamie already clocked in, the badge sits beside the worked status.
    await expect(table.getByRole("row", { name: /Sep 25/ })).toContainText("Holiday: Founders' Day");
    await expect(page.getByText("Student attendance")).toHaveCount(0);
  });

  test("month navigation works", async ({ page }) => {
    await staff(page);
    await page.goto("/staff/attendance");
    const label = page.getByTestId("month-label");
    const before = await label.innerText();
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(label).not.toHaveText(before);
    await expect(page.getByTestId("attendance-table")).toBeVisible();
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(label).toHaveText(before);
  });

  test("390px has no sideways page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await staff(page);
    await page.goto("/staff/attendance");
    await expect(page.getByTestId("attendance-table")).toBeVisible();
    await noSideScroll(page);
  });

  test("manager sees new columns, performance panel and working hours", async ({ page }) => {
    await manager(page);
    await page.goto("/manager/staff");
    for (const h of ["Late days (30d)", "Absent days (30d)", "High priority open", "Days worked (30d)"]) {
      await expect(page.getByRole("columnheader", { name: h })).toBeVisible();
    }
    await expect(page.getByLabel("Start time")).toHaveValue(/\d\d:\d\d/);
    await page.getByLabel("Grace minutes").fill("999");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/from 0 to 240/)).toBeVisible();
    await page.getByRole("button", { name: /View performance for Jamie/ }).click();
    const panel = page.getByRole("dialog", { name: "Performance" });
    await expect(panel.getByTestId("attendance-table")).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByText("Student attendance")).toHaveCount(0);
    await noSideScroll(page);
  });

  test("school owner and student cannot open the page", async ({ page }) => {
    await login(page, "demo.owner1@hanbee.test", "Demo#12345");
    await page.goto("/staff/attendance");
    await expect(page).toHaveURL(/not-authorized/);
  });

  test("student cannot open the page", async ({ page }) => {
    await login(page, "demo.s1@hanbee.test", "Demo#12345");
    await page.goto("/staff/attendance");
    await expect(page).toHaveURL(/not-authorized/);
  });
});
