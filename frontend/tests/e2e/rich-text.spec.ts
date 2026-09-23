import { test, expect } from "@playwright/test";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("lesson content bold/italic toolbar buttons wrap the selection with markdown", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/courses/1/edit");
  await page.getByRole("button", { name: /Welcome & syllabus/ }).click();

  const editor = page.getByLabel("Lesson content");
  await editor.fill("hello world");
  await editor.click();
  await editor.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 5));
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(editor).toHaveValue("**hello** world");
});

test("announcement composer supports bold text, rendered correctly in the feed", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/announcements");
  await page.getByRole("button", { name: "+ New announcement" }).click();

  const uniqueTitle = `Rich text check ${Date.now()}`;
  await page.getByPlaceholder("Announcement title").fill(uniqueTitle);
  const editor = page.getByPlaceholder("Write your announcement…");
  await editor.fill("this is important");
  await editor.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(8, 17));
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "Post" }).click();

  const titleEl = page.getByText(uniqueTitle, { exact: true });
  await expect(titleEl).toBeVisible();
  const card = titleEl.locator("xpath=ancestor::*[contains(@class,'rounded-2xl')][1]");
  await expect(card.locator("b", { hasText: "important" })).toBeVisible();
});
