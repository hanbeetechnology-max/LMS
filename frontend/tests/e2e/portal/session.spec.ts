import { expect, test, type Page } from "@playwright/test";

// A signed-in person must stay signed in after a full page reload, and a
// direct visit to a protected URL must work when a session already exists.
test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

const ROLES = [
  { name: "student", email: "demo.s1@hanbee.test", password: "Demo#12345", home: "/student/rc", deep: "/student/lms" },
  { name: "school owner", email: "demo.owner1@hanbee.test", password: "Demo#12345", home: "/school/overview", deep: "/school/students" },
  { name: "Hanbee staff", email: "jamie@hanbeelms.edu", password: "staff123", home: "/staff/my-space", deep: "/staff/schools" },
  { name: "manager", email: "morgan@hanbeelms.edu", password: "manager123", home: "/manager/monitor", deep: "/manager/schools" },
];

for (const role of ROLES) {
  test(`${role.name}: session survives a reload and a direct deep link`, async ({ page }) => {
    await signIn(page, role.email, role.password);
    await expect(page).toHaveURL(new RegExp(role.home));

    await page.reload();
    await expect(page).toHaveURL(new RegExp(role.home));

    await page.goto(role.deep);
    await expect(page).toHaveURL(new RegExp(role.deep));
    await expect(page).not.toHaveURL(/\/login/);
  });
}
