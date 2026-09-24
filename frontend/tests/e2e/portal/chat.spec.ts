import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

// Run: BASE_URL=http://localhost:5182 npx playwright test tests/e2e/portal/chat.spec.ts --workers=1
const BASE = process.env.BASE_URL ?? "http://localhost:5175";
const PASSWORD = "Demo#12345";
const OWNER = "demo.owner1@hanbee.test";
const STUDENT = "demo.s1@hanbee.test";
const OTHER_SCHOOL = "demo.t1@hanbee.test";
const GROUP = "Demo Public School - Students";
const STAMP = Date.now();

test.use({ baseURL: BASE });
test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, email: string, viewport = { width: 1280, height: 800 }) {
  const ctx: BrowserContext = await browser.newContext({ baseURL: BASE, viewport });
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(student|school|staff|manager)\//, { timeout: 20000 });
  return { ctx, page };
}

const chatPath = (email: string) => (email === OWNER ? "/school/chat" : "/student/chat");
const row = (page: Page, name: string) => page.getByRole("list", { name: "Chats" }).getByRole("button", { name: new RegExp(name) });

let owner: { ctx: BrowserContext; page: Page };
let student: { ctx: BrowserContext; page: Page };

test.beforeAll(async ({ browser }) => {
  owner = await signIn(browser, OWNER);
  student = await signIn(browser, STUDENT);
  await owner.page.goto(chatPath(OWNER));
  await student.page.goto(chatPath(STUDENT));
});

test.afterAll(async () => {
  await owner?.ctx.close();
  await student?.ctx.close();
});

test("student New chat never lists a person from another school", async () => {
  const p = student.page;
  await p.getByRole("button", { name: "New chat" }).click();
  await expect(p.getByRole("heading", { name: "New chat" })).toBeVisible();
  await expect(p.getByRole("region").first()).toBeVisible({ timeout: 10000 });
  await expect(p.getByText("Sample Academy")).toHaveCount(0);
  const html = await p.locator("body").innerText();
  expect(html).not.toContain(OTHER_SCHOOL);
  await p.getByRole("button", { name: "Back" }).click();
});

test("group message appears live, unread badge shows and clears, no reload", async () => {
  const body = `TEST portal-chat ${STAMP}`;
  // Student stays on the list (no chat open) so the row gets an unread badge.
  await expect(row(student.page, GROUP)).toBeVisible({ timeout: 15000 });

  await row(owner.page, GROUP).click();
  const composer = owner.page.getByLabel("Type a message");
  await composer.fill(body);
  await composer.press("Enter");
  await expect(owner.page.getByText(body)).toBeVisible();

  // Badge on student's row, live
  const badge = row(student.page, GROUP).getByLabel(/\d+ unread/);
  await expect(badge).toBeVisible({ timeout: 20000 });

  // Opening clears it and shows the message
  await row(student.page, GROUP).click();
  await expect(student.page.getByText(body)).toBeVisible({ timeout: 15000 });
  await expect(student.page).toHaveURL(/\?c=/);
  await expect(row(student.page, GROUP).getByLabel(/\d+ unread/)).toHaveCount(0, { timeout: 15000 });

  // Now live delivery into an open thread, no reload
  const second = `TEST portal-chat live ${STAMP}`;
  await owner.page.getByLabel("Type a message").fill(second);
  await owner.page.getByLabel("Type a message").press("Enter");
  await expect(student.page.getByText(second)).toBeVisible({ timeout: 15000 });
});

test("student has no add or remove controls; owner does", async () => {
  await student.page.getByRole("button", { name: /group info/i }).first().click();
  const info = student.page.getByRole("dialog", { name: "Group info" });
  await expect(info).toBeVisible();
  await expect(info.getByText(/members/).first()).toBeVisible();
  await expect(info.getByRole("button", { name: "Add member" })).toHaveCount(0);
  await expect(info.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
  await info.getByRole("button", { name: "Close group info" }).click();

  await owner.page.getByRole("button", { name: /group info/i }).first().click();
  const oinfo = owner.page.getByRole("dialog", { name: "Group info" });
  await expect(oinfo.getByRole("button", { name: "Add member" })).toBeVisible();
  await expect(oinfo.getByRole("button", { name: /^Remove/ }).first()).toBeVisible();
  // confirmation step exists (cancel, nothing removed)
  await oinfo.getByRole("button", { name: /^Remove/ }).first().click();
  await expect(oinfo.getByText("Remove from this group?")).toBeVisible();
  await oinfo.getByRole("button", { name: "Cancel" }).click();
  await oinfo.getByRole("button", { name: "Close group info" }).click();
});

test("direct chat ticks turn blue after the other person opens it", async () => {
  const p = owner.page;
  const studentName = (await student.page.getByRole("region", { name: "Chat list" }).locator("p.font-display").first().innerText()).trim();
  const ownerName = (await p.getByRole("region", { name: "Chat list" }).locator("p.font-display").first().innerText()).trim();
  await p.getByRole("button", { name: "New chat" }).click();
  await p.getByLabel("Search people").fill(studentName);
  await p.getByRole("region", { name: /^(Students|Instructors|School staff|Colleagues|School owner)$/ }).getByRole("button", { name: new RegExp(studentName) }).first().click();
  const body = `TEST portal-chat direct ${STAMP}`;
  // Wait for the direct thread (not the previously open group) before typing.
  await expect(p.getByRole("region", { name: "Conversation" }).getByRole("button", { name: studentName, exact: true })).toBeVisible({ timeout: 15000 });
  const composer = p.getByLabel("Type a message");
  await expect(composer).toBeVisible({ timeout: 15000 });
  await composer.fill(body);
  await composer.press("Enter");
  await expect(p.getByText(body)).toBeVisible();
  await expect(p.getByRole("img", { name: "Delivered" }).last()).toBeVisible({ timeout: 15000 });

  // Student sees the unread chat live, opens it, and the owner's ticks turn blue.
  const srow = row(student.page, ownerName);
  await expect(srow.getByLabel(/\d+ unread/)).toBeVisible({ timeout: 20000 });
  await srow.click();
  await expect(student.page.getByText(body)).toBeVisible();
  await expect(p.getByRole("img", { name: "Read" }).last()).toBeVisible({ timeout: 20000 });
});

test("mobile layout: list, then thread with a back arrow", async ({ browser }) => {
  const m = await signIn(browser, STUDENT, { width: 390, height: 844 });
  await m.page.goto(chatPath(STUDENT));
  await expect(m.page.getByRole("list", { name: "Chats" })).toBeVisible({ timeout: 15000 });
  await expect(m.page.getByLabel("Type a message")).toBeHidden();
  await row(m.page, GROUP).click();
  await expect(m.page.getByLabel("Type a message")).toBeVisible();
  await expect(m.page.getByRole("list", { name: "Chats" })).toBeHidden();
  await m.page.getByRole("button", { name: "Back to chats" }).click();
  await expect(m.page.getByRole("list", { name: "Chats" })).toBeVisible();
  await row(m.page, GROUP).click();
  await m.page.goBack();
  await expect(m.page.getByRole("list", { name: "Chats" })).toBeVisible();
  const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await m.ctx.close();
});
