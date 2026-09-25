import { expect, test } from "@playwright/test";

// The school owner can replace the shared join link. This test only goes as far
// as the confirmation and cancels, so the demo school's link is never changed
// (the replacement itself is proved by the database suite 0037).
test("owner sees Replace link with a confirmation; a teacher does not", async ({ browser }) => {
  async function open(email: string) {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill("Demo#12345");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL(/\/school\/overview/);
    await page.getByRole("link", { name: /^students$/i }).first().click();
    await expect(page).toHaveURL(/\/school\/students/);
    return page;
  }

  const owner = await open("demo.owner1@hanbee.test");
  await expect(owner.getByTestId("join-link")).toContainText("/join/");
  await owner.getByRole("button", { name: "Replace link" }).click();
  await expect(owner.getByText(/old link stops working at once/i)).toBeVisible();
  await owner.getByRole("button", { name: "Cancel" }).first().click();
  await expect(owner.getByRole("button", { name: "Replace link" })).toBeVisible();
  await owner.context().close();

  const teacher = await open("demo.teacher1@hanbee.test");
  await expect(teacher.getByTestId("join-link")).toContainText("/join/");
  await expect(teacher.getByRole("button", { name: "Replace link" })).toHaveCount(0);
  await teacher.context().close();
});
