import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(school|staff|manager)\//);
}

const stamp = Date.now();
const TITLE = `TEST portal-schedule ${stamp}`;
const SITE_TITLE = `TEST portal-schedule site ${stamp}`;

async function cleanup(page: Page, url: string, title: string) {
  await page.goto(url);
  for (let i = 0; i < 5; i++) {
    const b = page.getByRole("button", { name: new RegExp(title) }).first();
    if (!(await b.isVisible().catch(() => false))) break;
    await b.click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await page.waitForTimeout(800);
  }
}

async function addEvent(page: Page, title: string, scope?: string) {
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByLabel("Title").fill(title);
  if (scope) await page.getByLabel("Who sees it").selectOption(scope);
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.describe("schedule", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, "demo.owner1@hanbee.test", "Demo#12345");
    await cleanup(page, "/school/schedule", "TEST portal-schedule");
    await page.close();
    const p2 = await browser.newPage();
    await signIn(p2, "jamie@hanbeelms.edu", "staff123");
    await cleanup(p2, "/staff/schedule", "TEST portal-schedule");
    await p2.close();
  });

  test("school owner: views, today, create, edit, delete, holiday", async ({ page }) => {
    await signIn(page, "demo.owner1@hanbee.test", "Demo#12345");
    await page.goto("/school/schedule");
    await expect(page.getByTestId("week-grid")).toBeVisible();
    await expect(page.getByTestId("mini-calendar").locator("[data-today=true]")).toHaveCount(1);
    await expect(page.getByText("Founders' Day").first()).toBeVisible();
    await page.getByRole("button", { name: "day", exact: true }).click();
    await expect(page.getByTestId("day-grid")).toBeVisible();
    await page.getByRole("button", { name: "month", exact: true }).click();
    await expect(page.getByTestId("month-grid")).toBeVisible();
    await page.getByRole("button", { name: "week", exact: true }).click();

    await addEvent(page, TITLE);
    await expect(page.getByRole("button", { name: new RegExp(TITLE) }).first()).toBeVisible();
    await expect(page.getByTestId("upcoming").getByText(TITLE)).toBeVisible();

    await page.getByRole("button", { name: new RegExp(TITLE) }).first().click();
    await page.getByLabel("Title").fill(TITLE + " edited");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByTestId("upcoming").getByText(TITLE + " edited")).toBeVisible();

    await page.getByTestId("upcoming").getByText(TITLE + " edited").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByTestId("upcoming").getByText(TITLE + " edited")).toHaveCount(0);
  });

  test("hanbee staff: site event, holiday shown, no holiday control", async ({ page }) => {
    await signIn(page, "jamie@hanbeelms.edu", "staff123");
    await page.goto("/staff/schedule");
    await expect(page.getByText("Founders' Day").first()).toBeVisible();
    await page.getByRole("button", { name: "+ Add" }).click();
    await expect(page.getByRole("button", { name: "holiday", exact: true })).toHaveCount(0);
    await expect(page.getByTestId("holiday-form")).toHaveCount(0);
    await page.getByLabel("Title").fill(SITE_TITLE);
    await page.getByLabel("Who sees it").selectOption("site");
    await page.getByRole("button", { name: "Add event", exact: true }).click();
    await expect(page.getByRole("button", { name: new RegExp(SITE_TITLE) }).first()).toBeVisible();
    await page.getByRole("button", { name: new RegExp(SITE_TITLE) }).first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByRole("button", { name: new RegExp(SITE_TITLE) })).toHaveCount(0);
  });

  test("390px: no sideways page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signIn(page, "demo.owner1@hanbee.test", "Demo#12345");
    await page.goto("/school/schedule");
    for (const v of ["week", "day", "month"]) {
      await page.getByRole("button", { name: v, exact: true }).click();
      const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(over).toBe(false);
    }
    await page.screenshot({ path: "test-results/schedule-390.png", fullPage: true });
  });
});

// Only the manager may add holidays. The form is checked, never submitted, so no real holiday is created.
test("manager schedule has the holiday form; it is not offered to Hanbee staff", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("morgan@hanbeelms.edu");
  await page.getByLabel(/^password/i).fill("manager123");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/manager\/monitor/);
  await page.getByRole("link", { name: /^schedule$/i }).first().click();
  await expect(page).toHaveURL(/manager\/schedule/);
  await page.getByRole("button", { name: /^\+ ?add$/i }).first().click();
  const dialog = page.getByRole("dialog");
  const holidayTab = dialog.getByRole("button", { name: "holiday", exact: true });
  await expect(holidayTab).toBeVisible();
  await holidayTab.click();
  await expect(page.getByTestId("holiday-form")).toBeVisible();
  await expect(dialog.getByLabel("Holiday name")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Add holiday" })).toBeVisible();
});
