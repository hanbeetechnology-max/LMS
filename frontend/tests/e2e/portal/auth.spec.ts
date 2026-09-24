import { expect, test, type Page } from "@playwright/test";

// Run with: BASE_URL=http://localhost:5181 npx playwright test tests/e2e/portal/auth.spec.ts --workers=1
test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:5175" });

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

const ROLES: [string, string, string, string][] = [
  ["student", "demo.s1@hanbee.test", "Demo#12345", "/student/rc"],
  ["school owner", "demo.owner1@hanbee.test", "Demo#12345", "/school/overview"],
  ["Hanbee staff", "jamie@hanbeelms.edu", "staff123", "/staff/my-space"],
  ["manager", "morgan@hanbeelms.edu", "manager123", "/manager/monitor"],
];

for (const [label, email, password, home] of ROLES) {
  test(`${label} signs in and lands on ${home}`, async ({ page }) => {
    await signIn(page, email, password);
    await expect(page).toHaveURL(new RegExp(`${home}$`), { timeout: 20_000 });
  });
}

test("wrong password shows the generic error", async ({ page }) => {
  await signIn(page, "demo.s1@hanbee.test", "not-the-password");
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await expect(page).toHaveURL(/\/login$/);
});

test("invalid join link shows the invalid page", async ({ page }) => {
  await page.goto("/join/not-a-real-token");
  await expect(page.getByRole("heading", { name: "This link is not valid" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Go to the home page" })).toBeVisible();
});

test("register-school blocks submit without consent and with a short password", async ({ page }) => {
  await page.goto("/register-school");
  await page.getByLabel("Your full name").fill("TEST Nobody");
  await page.getByLabel("Your email").fill("test-nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("short");
  await page.getByLabel("School name").fill("TEST School");
  await page.getByLabel("School registration number").fill("REG-0");
  await page.getByLabel("Official school email").fill("office@example.com");
  await page.getByRole("button", { name: "Register school" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await expect(page.getByText(/must confirm guardian consent/)).toBeVisible();
  await expect(page).toHaveURL(/\/register-school$/);
});

test("signup explains manager approval", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Hanbee staff application" })).toBeVisible();
  await expect(page.getByText(/manager's approval/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Register your school" })).toBeVisible();
});

test("tournament is marketing only and offers the school CTA", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.getByRole("link", { name: /Register your school/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByLabel("Driver name")).toHaveCount(0);
});

test("signed-out visit to /student/rc goes to /login", async ({ page }) => {
  await page.goto("/student/rc");
  await expect(page).toHaveURL(/\/login$/);
});
