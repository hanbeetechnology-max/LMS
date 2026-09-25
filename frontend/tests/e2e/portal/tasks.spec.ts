import { readFileSync } from "fs";
import { test, expect, type Page } from "@playwright/test";

const SHOTS = process.env.TASK_SHOTS;

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

const title = `TEST portal-tasks ${Date.now()}`;

// Creates a real task for Jamie through the public API (as Jamie), so the
// manager test never depends on leftovers. Returns a cleanup function.
async function seedJamieTask(taskTitle: string): Promise<() => Promise<void>> {
  const env = readFileSync("tests/../.env.local", "utf8");
  const url = env.match(/VITE_SUPABASE_URL=(.+)/)![1].trim();
  const anon = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)![1].trim();
  const grant = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "jamie@hanbeelms.edu", password: "staff123" }),
  }).then((r) => r.json());
  const headers = { apikey: anon, Authorization: `Bearer ${grant.access_token}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const created = await fetch(`${url}/rest/v1/staff_tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({ staff_id: grant.user.id, title: taskTitle, priority: "high" }),
  }).then((r) => r.json());
  const id = created[0].id as string;
  return async () => {
    await fetch(`${url}/rest/v1/staff_tasks?id=eq.${id}`, { method: "DELETE", headers });
  };
}


async function noSideScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await login(page, "jamie@hanbeelms.edu", "staff123");
  await page.goto("/staff/tasks");
  await page.getByRole("button", { name: "List", exact: true }).click();
  for (;;) {
    const del = page.getByRole("button", { name: /^Delete task "TEST portal-tasks/ }).first();
    if (!(await del.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await del.click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await page.waitForTimeout(800);
  }
  await page.close();
});

test.describe("Tasks page", () => {
  test.describe.configure({ mode: "serial" });

  test("staff: create, move, list, edit priority, delete", async ({ page }) => {
    await login(page, "jamie@hanbeelms.edu", "staff123");
    await page.goto("/staff/tasks");
    await page.getByRole("button", { name: "New task" }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Priority").selectOption("high");
    await page.getByRole("button", { name: "Create task" }).click();
    const todo = page.getByTestId("col-todo");
    await expect(todo.getByText(title)).toBeVisible();
    await expect(todo.getByText("High").first()).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/board-1280.png` });
    await page.getByRole("button", { name: `Move "${title}" to In progress` }).click();
    await expect(page.getByTestId("col-in_progress").getByText(title)).toBeVisible();
    await page.getByRole("button", { name: `Move "${title}" to Done` }).click();
    await expect(page.getByTestId("col-done").getByText(title)).toBeVisible();
    await page.getByRole("button", { name: "List", exact: true }).click();
    const row = page.getByTestId("task-row").filter({ hasText: title });
    await expect(row).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/list-1280.png` });
    await page.getByRole("button", { name: `Edit "${title}"` }).click();
    await page.getByLabel("Priority").selectOption("low");
    await page.getByRole("button", { name: "Save task" }).click();
    await expect(row.getByText("Low")).toBeVisible();
    await page.getByRole("button", { name: `Delete task "${title}"` }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("manager: all employees tab is read only", async ({ page }) => {
    const cleanup = await seedJamieTask(`TEST portal-tasks manager view ${Date.now()}`);
    try {
    await login(page, "morgan@hanbeelms.edu", "manager123");
    await page.goto("/manager/tasks");
    await page.getByRole("tab", { name: "All employees' tasks" }).click();
    await expect(page.getByLabel("Person")).toBeVisible();
    const jamie = page.getByLabel("Person").locator("option", { hasText: /Jamie/ });
    await expect(jamie.first()).toBeAttached();
    await expect(page.getByRole("button", { name: /^(Edit|Delete|Move)/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New task" })).toHaveCount(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/manager-1280.png` });
    } finally {
      await cleanup();
    }
  });

  test("school owner can open /school/tasks", async ({ page }) => {
    await login(page, "demo.owner1@hanbee.test", "Demo#12345");
    await page.goto("/school/tasks");
    await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();
  });

  test("student cannot open /staff/tasks", async ({ page }) => {
    await login(page, "ava@student.edu", "student123");
    await page.goto("/staff/tasks");
    await expect(page.getByRole("heading", { name: "My Tasks" })).toHaveCount(0);
  });

  test("390px has no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await login(page, "jamie@hanbeelms.edu", "staff123");
    await page.goto("/staff/tasks");
    await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();
    await noSideScroll(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/board-390.png` });
    await page.getByRole("button", { name: "List", exact: true }).click();
    await noSideScroll(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/list-390.png` });
  });
});
