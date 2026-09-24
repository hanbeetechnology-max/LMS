import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test.describe("manager portal", () => {
  test("lands on monitor with stats and activity, nav has no dead links", async ({ page }) => {
    await signIn(page, "morgan@hanbeelms.edu", "manager123");
    await expect(page).toHaveURL(/\/manager\/monitor$/);
    await expect(page.getByText("Needs your attention")).toBeVisible();
    await expect(page.getByText("Active schools")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();

    for (const label of ["Monitor", "Verifications", "Schools", "Hanbee staff", "Announcements", "Tasks", "Chat"]) {
      const link = page.getByRole("link", { name: label, exact: true }).first();
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/something went wrong|unexpected error/i)).toHaveCount(0);
    }
  });

  test("schools, staff and verifications screens", async ({ page }) => {
    await signIn(page, "morgan@hanbeelms.edu", "manager123");
    await page.goto("/manager/schools");
    await expect(page.getByText("Demo Public School")).toBeVisible();
    await expect(page.getByText("Sample Academy")).toBeVisible();

    await page.goto("/manager/staff");
    const row = page.getByRole("row", { name: /Jamie Rivera/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/\d+(\.\d)? h/);
    // confirm dialog opens and cancels without acting
    await row.getByRole("button", { name: "Suspend" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto("/manager/verifications");
    await expect(page.getByRole("heading", { name: "Schools waiting for verification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hanbee staff applications" })).toBeVisible();
  });

  test("hanbee staff and students cannot open the manager monitor", async ({ page }) => {
    await signIn(page, "jamie@hanbeelms.edu", "staff123");
    await page.waitForURL(/\/staff\//);
    await page.goto("/manager/monitor");
    await expect(page).not.toHaveURL(/\/manager\/monitor/);
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await signIn(page, "ava@student.edu", "student123");
    await page.waitForURL(/\/student\//);
    await page.goto("/manager/monitor");
    await expect(page).not.toHaveURL(/\/manager\/monitor/);
  });
});
