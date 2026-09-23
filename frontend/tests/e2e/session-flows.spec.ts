import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

test("roster row menu removes a student from a section with a confirming toast", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");

  // The row is the email <p>'s grandparent: <p>email</p> -> name/email <div> -> row container.
  const row = page.locator("p", { hasText: "ava@student.edu" }).locator("..").locator("..");
  await row.getByRole("button", { name: "Actions for Ava Chen" }).click();
  await page.getByRole("button", { name: "Remove from section" }).click();

  await expect(page.getByText("Ava Chen removed from Intro to Design — Section B.")).toBeVisible();
  await expect(row.getByText("dropped")).toBeVisible();
});

test("course editor: uploading a file adds it to Materials with a confirming toast", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/courses/1/edit");

  await page.setInputFiles('input[type="file"]', path.join(__dirname, "fixtures", "sample.txt"));

  await expect(page.getByText("1 file uploaded.")).toBeVisible();
  await expect(page.getByText("sample.txt")).toBeVisible();
});

test("course editor: lesson content type controls what's editable, not just a generic upload box", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/courses/1/edit");

  // l1 "Welcome & syllabus" is contentType "text" — should show a text body field, not Materials.
  await page.getByText("Welcome & syllabus").click();
  await expect(page.getByLabel("Lesson content")).toBeVisible();
  await expect(page.getByText("Materials")).toHaveCount(0);

  // l5 "Further reading" is contentType "link" — should show a URL field, not Materials.
  await page.getByText("Further reading").click();
  await expect(page.getByLabel("External link")).toBeVisible();
  await expect(page.getByText("Materials")).toHaveCount(0);

  // l2 "Color theory basics" is contentType "video" — should show the Materials uploader.
  await page.getByText("Color theory basics").click();
  await expect(page.getByText("Materials")).toBeVisible();
  await expect(page.getByLabel("Lesson content")).toHaveCount(0);
  await expect(page.getByLabel("External link")).toHaveCount(0);
});

test("forums: a user can edit and delete their own reply, but not others'", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/forums");
  await page.locator("button", { hasText: "Welcome" }).first().click();

  await page.getByPlaceholder("Write a reply…").fill("My own test reply.");
  await page.getByRole("button", { name: "Reply" }).click();

  const ownPost = page.locator("div", { hasText: "My own test reply." }).last();
  await expect(ownPost.getByRole("button", { name: "Edit" })).toBeVisible();

  await ownPost.getByRole("button", { name: "Edit" }).click();
  await page.locator("textarea").last().fill("My edited reply.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("My edited reply.")).toBeVisible();

  await page.locator("div", { hasText: "My edited reply." }).last().getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("My edited reply.")).toHaveCount(0);
  await expect(page.getByText("Post deleted.")).toBeVisible();

  // Other people's posts never show Edit/Delete controls.
  const othersPost = page.locator("div", { hasText: "Kick things off by sharing your name" }).last();
  await expect(othersPost.getByRole("button", { name: "Edit" })).toHaveCount(0);
});

test("global search finds and navigates to a nav destination", async ({ page }) => {
  await loginAsStaff(page);

  await page.getByPlaceholder("Search…").fill("roster");
  await page.getByRole("button", { name: "Roster" }).click();

  await expect(page).toHaveURL(/\/staff\/roster$/);
});
