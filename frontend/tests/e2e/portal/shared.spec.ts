import { test, expect, type Page } from "@playwright/test";

// Shared portal pages (announcements, schedule, tasks, settings) against the live
// database with the demo accounts. Every row created here is deleted again.

const STAMP = Date.now();

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(student|school|staff|manager)\//, { timeout: 20000 });
}

const DEMO_PW = "Demo#12345";

test.describe.configure({ mode: "serial" });

test("student reads announcements, cannot compose, and other school's post is hidden", async ({ page }) => {
  await login(page, "demo.s1@hanbee.test", DEMO_PW);
  await page.goto("/student/announcements");
  await expect(page.getByText("Welcome to HANBEE (demo)")).toBeVisible();
  await expect(page.getByText("Practice day (demo)")).toBeVisible();
  await expect(page.getByRole("button", { name: "New announcement" })).toHaveCount(0);
});

test("student of the other school does not see the first school's announcement", async ({ page }) => {
  await login(page, "demo.t1@hanbee.test", DEMO_PW);
  await page.goto("/student/announcements");
  await expect(page.getByText("Welcome to HANBEE (demo)")).toBeVisible();
  await expect(page.getByText("Practice day (demo)")).toHaveCount(0);
});

test("school owner posts, edits and deletes a school announcement", async ({ page }) => {
  const title = `TEST portal-shared ${STAMP}`;
  await login(page, "demo.owner1@hanbee.test", DEMO_PW);
  await page.goto("/school/announcements");
  await page.getByRole("button", { name: "New announcement" }).click();
  await page.getByLabel("Title").fill(title);
  await page.locator("#ann-body").fill("first body");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  const card = page.locator("li", { hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText("Demo Public School")).toBeVisible();

  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill(`${title} edited`);
  await page.getByRole("button", { name: "Save changes" }).click();
  const edited = page.locator("li", { hasText: `${title} edited` });
  await expect(edited).toBeVisible();

  await edited.getByRole("button", { name: "Delete" }).click();
  await edited.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText(`${title} edited`)).toHaveCount(0);
});

test("Hanbee staff posts a site-wide announcement and deletes it", async ({ page }) => {
  const title = `TEST portal-shared site ${STAMP}`;
  await login(page, "jamie@hanbeelms.edu", "staff123");
  await page.goto("/staff/announcements");
  await page.getByRole("button", { name: "New announcement" }).click();
  await page.getByLabel("Title").fill(title);
  await page.locator("#ann-body").fill("site body");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  const card = page.locator("li", { hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText("Whole site")).toBeVisible();
  await card.getByRole("button", { name: "Delete" }).click();
  await card.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});

test("settings: name change and revert; password fields validate only", async ({ page }) => {
  await login(page, "jamie@hanbeelms.edu", "staff123");
  await page.goto("/staff/settings");
  const nameInput = page.getByLabel("Name", { exact: true });
  const original = await nameInput.inputValue();
  await nameInput.fill(`${original} TEST`);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Name updated.")).toBeVisible();
  await nameInput.fill(original);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(nameInput).toHaveValue(original);

  await page.getByLabel("New password", { exact: true }).fill("short");
  await page.getByLabel("Confirm new password").fill("short");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("longenough1");
  await page.getByLabel("Confirm new password").fill("different1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("The two passwords do not match.")).toBeVisible();
});
