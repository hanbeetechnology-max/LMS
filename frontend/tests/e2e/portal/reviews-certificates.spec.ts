import { test, expect, type Page } from "@playwright/test";

// Lesson reviews and certificates for all four roles. Read-mostly: it never
// verifies a real pending review (only opens the confirm and cancels it).
// Run with --workers=1. Set SHOTS=<dir> to also save screenshots.
const SHOTS = process.env.SHOTS;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function shots(page: Page, name: string) {
  if (!SHOTS) return;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}-1280.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}-390.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function noSideScroll(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(wide, `${page.url()} scrolls sideways at 390px`).toBe(false);
  await page.setViewportSize({ width: 1280, height: 900 });
}

test.describe("reviews and certificates", () => {
  test("Hanbee staff: reviews with tabs, verify confirm (cancelled), certificates and verify box", async ({ page }) => {
    await signIn(page, "jamie@hanbeelms.edu", "staff123");
    await page.getByRole("link", { name: "Reviews", exact: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/reviews$/);
    await expect(page.getByRole("heading", { name: "Lesson reviews" })).toBeVisible();
    for (const label of ["Waiting now", "Verified today", "Average score"]) await expect(page.getByText(label, { exact: true })).toBeVisible();
    for (const tab of ["Waiting", "Verified", "All"]) await expect(page.getByRole("tab", { name: tab, exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "All", exact: true }).click();
    await expect(page.getByRole("row").nth(1)).toBeVisible();
    await expect(page.getByText(/Demo/).first()).toBeVisible();
    await page.getByRole("tab", { name: "Verified", exact: true }).click();
    await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Waiting", exact: true }).click();

    const verify = page.getByRole("button", { name: /Verify review by/ }).first();
    await expect(verify).toBeVisible();
    await verify.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Verify this review?")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByLabel("Search").fill("zzz-nobody");
    await expect(page.getByText("No reviews match")).toBeVisible();
    await page.getByLabel("Search").fill("");
    await noSideScroll(page);
    await page.getByRole("tab", { name: "All", exact: true }).click();
    await shots(page, "hanbee-reviews");

    // LMS overview has the compact card, not the old panel
    await page.goto("/staff/lms");
    await expect(page.getByText(/lesson reviews? waiting/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open reviews" })).toHaveAttribute("href", "/staff/reviews");

    await page.getByRole("link", { name: "Certificates", exact: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/certificates$/);
    await expect(page.getByText("Total issued", { exact: true })).toBeVisible();
    const view = page.getByRole("link", { name: /View certificate/ }).first();
    await expect(view).toBeVisible();
    await expect(view).toHaveAttribute("rel", /noopener/);
    await expect(view).toHaveAttribute("target", "_blank");
    const href = (await view.getAttribute("href")) ?? "";
    const id = href.split("/verify/")[1];
    expect(id).toBeTruthy();
    await expect(page.getByRole("button", { name: "Copy verify link" }).first()).toBeVisible();

    await page.getByLabel("Certificate id or verify link").fill(`https://example.test/verify/${id}`);
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByText(/^Valid:/)).toBeVisible();
    await page.getByLabel("Certificate id or verify link").fill("00000000-0000-0000-0000-000000000000");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByText(/^Not found/)).toBeVisible();
    await noSideScroll(page);
    await shots(page, "hanbee-certificates");
  });

  test("manager sees both pages read-only", async ({ page }) => {
    await signIn(page, "morgan@hanbeelms.edu", "manager123");
    await page.getByRole("link", { name: "Reviews", exact: true }).first().click();
    await expect(page).toHaveURL(/\/manager\/reviews$/);
    await expect(page.getByText("Reviews are verified by Hanbee staff").first()).toBeVisible();
    await page.getByRole("tab", { name: "All", exact: true }).click();
    await expect(page.getByRole("row").nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: /Verify/ })).toHaveCount(0);
    await noSideScroll(page);
    await shots(page, "manager-reviews");

    await page.getByRole("link", { name: "Certificates", exact: true }).first().click();
    await expect(page).toHaveURL(/\/manager\/certificates$/);
    await expect(page.getByRole("link", { name: /View certificate/ }).first()).toBeVisible();
    await noSideScroll(page);
    await shots(page, "manager-certificates");
  });

  test("school owner sees Lesson reviews and Certificates tabs for their own school only", async ({ page }) => {
    await signIn(page, "demo.owner1@hanbee.test", "Demo#12345");
    await page.goto("/school/courses");
    await expect(page.getByRole("tab", { name: "Participation" })).toBeVisible();
    await shots(page, "school-participation");

    await page.getByRole("tab", { name: "Lesson reviews" }).click();
    await expect(page.getByRole("row").nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: /Verify/ })).toHaveCount(0);
    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/Sample Academy/);
    expect(body).toMatch(/passed|failed/);
    await shots(page, "school-reviews");

    await page.getByRole("tab", { name: "Certificates" }).click();
    await expect(page.getByRole("link", { name: /View certificate/ }).first()).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(/Sample Academy/);
    await noSideScroll(page);
    await shots(page, "school-certificates");
  });

  test("student: reviews, certificates, printable page; cannot open staff reviews", async ({ page }) => {
    await signIn(page, "demo.s1@hanbee.test", "Demo#12345");
    await page.goto("/student/lms");
    await page.getByRole("link", { name: /Certificates, open/ }).click();
    await expect(page).toHaveURL(/\/student\/lms\/certificates$/);

    await page.getByRole("link", { name: "Reviews", exact: true }).first().click();
    await expect(page).toHaveURL(/\/student\/lms\/reviews$/);
    await expect(page.getByText("Waiting", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/unlocks in \d+ min|Verified|unlocked automatically/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open lesson" }).first()).toBeVisible();
    await noSideScroll(page);
    await shots(page, "student-reviews");

    // demo.s1 has not finished a course; earned-certificate card is checked with demo.t1
    await page.getByRole("link", { name: "Certificates", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Still to earn" })).toBeVisible();
    await expect(page.getByText(/\d+ of \d+ lessons done/).first()).toBeVisible();
    await noSideScroll(page);

    await page.goto("/staff/reviews");
    await expect(page).not.toHaveURL(/\/staff\/reviews/);
  });

  test("student with a certificate sees the card and the printable page", async ({ page }) => {
    await signIn(page, "demo.s3@hanbee.test", "Demo#12345");
    await page.goto("/student/lms/certificates");
    await expect(page.getByRole("button", { name: "Copy verify link" }).first()).toBeVisible();
    await expect(page.getByText(/Serial /).first()).toBeVisible();
    await shots(page, "student-certificates");
    await page.getByRole("link", { name: "View and print" }).first().click();
    await expect(page).toHaveURL(/\/student\/lms\/certificates\/[0-9a-f-]+$/);
    const cert = page.getByLabel("Certificate of completion");
    await expect(cert).toBeVisible();
    await expect(cert.getByText(/Serial /)).toBeVisible();
    await expect(cert.getByText(/Verify at .*\/verify\//)).toBeVisible();
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
    await noSideScroll(page);
    await shots(page, "student-certificate-print");
  });
});
