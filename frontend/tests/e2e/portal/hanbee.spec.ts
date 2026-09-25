import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

const loginStaff = (page: Page) => login(page, "jamie@hanbeelms.edu", "staff123");

test.describe("Hanbee staff portal", () => {
  test("lands on my space with a clock panel and attention strip", async ({ page }) => {
    await loginStaff(page);
    await expect(page).toHaveURL(/\/staff\/my-space$/);
    await expect(page.getByTestId("clock-status")).toBeVisible();
    await expect(page.getByText("Needs your attention")).toBeVisible();
    await expect(page.getByText("Last 7 days")).toBeVisible();
  });

  test("clock in then clock out (only when not already clocked in today)", async ({ page }) => {
    await loginStaff(page);
    await expect(page).toHaveURL(/\/staff\/my-space$/);
    const status = page.getByTestId("clock-status");
    await expect(status).toBeVisible();
    if ((await status.innerText()).trim() !== "Not clocked in") {
      test.skip(true, "Already clocked in or out today; not touching it.");
    }
    await page.getByRole("button", { name: "Clock in", exact: true }).click();
    await expect(page.getByText(/Clocked in\. The server recorded/)).toBeVisible();
    await expect(status).toContainText("Clocked in at");
    await page.getByRole("button", { name: "Clock out", exact: true }).click();
    await expect(page.getByText(/Clocked out\./)).toBeVisible();
    await expect(status).toContainText("Clocked out at");
  });

  test("create, complete and delete a task", async ({ page }) => {
    await loginStaff(page);
    const title = `TEST portal-hanbee ${Date.now()}`;
    await page.getByLabel("New task").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText(title)).toBeVisible();
    await page.getByLabel(`Mark "${title}" done`).click();
    await expect(page.getByLabel(`Mark "${title}" not done`)).toBeChecked();
    await page.getByRole("button", { name: `Delete task "${title}"` }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("schools directory lists the demo schools as active and opens their students", async ({ page }) => {
    await loginStaff(page);
    await page.goto("/staff/schools");
    const demo = page.getByRole("row", { name: /Demo Public School/ });
    const sample = page.getByRole("row", { name: /Sample Academy/ });
    await expect(demo).toContainText("active");
    await expect(sample).toContainText("active");

    await demo.click();
    await expect(page).toHaveURL(/\/staff\/schools\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: "Demo Public School" })).toBeVisible();
    await expect(page.getByText("Aarav").first()).toBeVisible();

    await page.goto("/staff/schools");
    await page.getByRole("row", { name: /Sample Academy/ }).click();
    await expect(page.getByText("Ishaan").first()).toBeVisible();
  });

  test("school actions stop at the confirm dialog", async ({ page }) => {
    await loginStaff(page);
    await page.goto("/staff/schools");
    await page.getByRole("row", { name: /Sample Academy/ }).click();
    await page.getByRole("button", { name: "Close school" }).click();
    await expect(page.getByRole("dialog")).toContainText(/students keep their accounts/i);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: /^Suspend Ishaan/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("tournament page shows the RC Cup with verified and awaiting teams", async ({ page }) => {
    await loginStaff(page);
    await page.goto("/staff/tournament");
    await expect(page.getByText("Hanbee RC Cup 2026").first()).toBeVisible();
    await expect(page.getByRole("row", { name: /Alpha Racers/ }).first()).toContainText("verified");
    await expect(page.getByRole("row", { name: /Sample Speed/ })).toContainText(/payment declared|applied/);
    await expect(page.getByText(/Payment is only a claim/)).toBeVisible();
    // Decision buttons stop at the dialog.
    await page.getByRole("button", { name: "Verify Sample Speed" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("courses: select Intro to Design, see students, click through to the school", async ({ page }) => {
    await loginStaff(page);
    await page.goto("/staff/courses");
    await expect(page.getByRole("heading", { name: "Intro to Design", exact: true })).toBeVisible();
    const pick = page.getByRole("button", { name: "View students of Intro to Design" });
    if (await pick.count()) await pick.click();
    const table = page.getByRole("region", { name: /Students in Intro to Design/ });
    await expect(table).toContainText("Demo Public School");
    await expect(table.getByText("New", { exact: true }).first()).toBeVisible();
    await table.getByRole("row", { name: /Demo Public School/ }).first().click();
    await expect(page).toHaveURL(/\/staff\/schools\/[0-9a-f-]+$/);
  });

  test("lms overview and applications render", async ({ page }) => {
    await loginStaff(page);
    await page.goto("/staff/lms");
    await expect(page.getByText("Active students")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Intro to Design" })).toBeVisible();
    await page.goto("/staff/applications");
    await expect(page.getByRole("heading", { name: "Enroll a student directly" })).toBeVisible();
  });

  test("a school owner cannot open the schools directory", async ({ page }) => {
    await login(page, "demo.owner1@hanbee.test", "Demo#12345");
    await expect(page).toHaveURL(/\/school\/overview$/);
    await page.goto("/staff/schools");
    await expect(page).toHaveURL(/not-authorized/);
  });

  test("a student cannot open the schools directory", async ({ page }) => {
    await login(page, "demo.s1@hanbee.test", "Demo#12345");
    await expect(page).toHaveURL(/\/student\//);
    await page.goto("/staff/schools");
    await expect(page).toHaveURL(/not-authorized/);
  });
});
