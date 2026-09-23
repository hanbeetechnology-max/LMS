import { test, expect } from "@playwright/test";

const STAFF = { email: "jamie@hanbeelms.edu", password: "staff123" };

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(STAFF.email);
  await page.getByLabel("Password").fill(STAFF.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test('"+ New course" opens the course creation wizard, not a dead button', async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/courses");

  await page.getByRole("link", { name: "+ New course" }).click();

  await expect(page).toHaveURL(/\/staff\/courses\/new$/);
  await expect(page.getByRole("heading", { name: "Course details" })).toBeVisible();
});

test("footer content links (About, Contact, Privacy, Terms) all navigate to a real page", async ({ page }) => {
  await page.goto("/");

  for (const [label, path] of [
    ["About", "/about"],
    ["Contact", "/contact"],
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
  ] as const) {
    await page.goto("/");
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("link", { name: "← Back to home" })).toBeVisible();
  }
});
