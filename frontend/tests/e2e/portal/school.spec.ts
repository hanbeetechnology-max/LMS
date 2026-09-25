import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "Demo#12345";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function go(page: Page, label: string, url: RegExp) {
  await page.getByRole("link", { name: label, exact: true }).first().click();
  await expect(page).toHaveURL(url);
}

test.describe("school staff portal", () => {
  test("overview: school name, Tournament first, switch to Learning, team shown", async ({ page }) => {
    await signIn(page, "demo.owner1@hanbee.test");
    await expect(page).toHaveURL(/\/school\/overview$/);
    await expect(page.getByRole("heading", { name: "Demo Public School" })).toBeVisible();
    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toHaveText("Tournament");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Alpha Racers")).toBeVisible();
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Students enrolled")).toBeVisible();
    await expect(page.getByText("Intro to Design")).toBeVisible();
  });

  test("students: own school only, invite counts, mail step, revoke", async ({ page }) => {
    await signIn(page, "demo.owner1@hanbee.test");
    await go(page, "Students", /\/school\/students$/);
    const table = page.locator("table").first();
    await expect(table.getByText("Aarav")).toBeVisible();
    await expect(table.getByText("Diya")).toBeVisible();
    await expect(table.getByText("Kabir")).toBeVisible();
    await expect(table.getByText("Meera")).toBeVisible();
    await expect(page.getByText("Ishaan")).toHaveCount(0);
    await expect(page.getByText("Tara")).toHaveCount(0);

    const stamp = Date.now();
    const a = `test-invite-${stamp}-a@hanbee.test`;
    const b = `test-invite-${stamp}-b@hanbee.test`;
    await page.getByLabel("Student emails").fill(`${a}, ${b}\nnot-an-email`);
    await expect(page.getByTestId("invite-counts")).toContainText("2 valid");
    await expect(page.getByTestId("invite-counts")).toContainText("1 invalid");
    await page.getByRole("button", { name: /Send 2 invitations/ }).click();

    await expect(page.getByText("Send the invitations from your own email")).toBeVisible();
    const batch = page.getByTestId("mail-batch");
    await expect(batch).toContainText("Message 1 of 1, 2 students");
    const href = await batch.getByRole("link", { name: "Open in mail app" }).getAttribute("href");
    expect(href).toContain("bcc=");
    expect(decodeURIComponent(href!)).toContain("/join/");
    await expect(batch.getByRole("link", { name: "Gmail" })).toHaveAttribute("rel", /noopener/);

    // Clean up: revoke both test invitations.
    for (const email of [a, b]) {
      const row = page.getByRole("row").filter({ hasText: email }).last();
      await row.getByRole("button", { name: /^Revoke invitation/ }).click();
      await row.getByRole("button", { name: "Confirm revoke" }).click();
      await expect(page.getByRole("row").filter({ hasText: email }).last()).toContainText("revoked");
    }
  });

  test("teachers card is owner only", async ({ page }) => {
    await signIn(page, "demo.owner1@hanbee.test");
    await go(page, "Students", /\/school\/students$/);
    await expect(page.getByRole("heading", { name: "Teachers" })).toBeVisible();
    await page.context().clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await signIn(page, "demo.teacher1@hanbee.test");
    await go(page, "Students", /\/school\/students$/);
    await expect(page.getByRole("heading", { name: "Invite students" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Teachers" })).toHaveCount(0);
  });

  test("teams page lists Alpha Racers", async ({ page }) => {
    await signIn(page, "demo.owner1@hanbee.test");
    await go(page, "Teams", /\/school\/teams$/);
    await expect(page.getByRole("heading", { name: "Alpha Racers" })).toBeVisible();
  });

  test("courses page lists Intro to Design with own students only", async ({ page }) => {
    await signIn(page, "demo.owner1@hanbee.test");
    await go(page, "Courses", /\/school\/courses$/);
    await page.getByRole("button", { name: "Intro to Design" }).click();
    await expect(page.getByText("Students in Intro to Design")).toBeVisible();
    await expect(page.getByText("Aarav")).toBeVisible();
    await expect(page.getByText("Ishaan")).toHaveCount(0);
    await expect(page.getByText("Tara")).toHaveCount(0);
  });

  test("another school's owner sees only their own school", async ({ page }) => {
    await signIn(page, "demo.owner2@hanbee.test");
    await expect(page.getByRole("heading", { name: "Sample Academy" })).toBeVisible();
    await expect(page.getByText("Demo Public School")).toHaveCount(0);
  });

  test("no sideways page scroll at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "demo.owner1@hanbee.test");
    await expect(page.getByRole("heading", { name: "Demo Public School" })).toBeVisible();
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(await overflow()).toBe(false);
    for (const path of ["students", "teams", "courses"]) {
      await page.goto(`/school/${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await overflow()).toBe(false);
    }
  });

  test("a student cannot open the school overview", async ({ page }) => {
    await signIn(page, "demo.s1@hanbee.test");
    await page.waitForURL(/\/student\//);
    await page.goto("/school/overview");
    await expect(page).not.toHaveURL(/\/school\/overview$/);
  });
});
