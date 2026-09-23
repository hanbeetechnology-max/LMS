import { test, expect } from "@playwright/test";

// Exercises whichever real backend is actually configured and reachable —
// Supabase (supabase/) when VITE_SUPABASE_URL/ANON_KEY are set (see
// lib/AuthProvider.tsx's three-tier priority), else the backend/ FastAPI
// prototype (started by playwright.config.ts's second webServer entry) —
// instead of the offline mock in lib/mockAuth.ts. Confirms real login,
// session persistence, and announcement delivery work end-to-end against
// whichever one is live, not just the UI against static data.

test("signing in reaches a real backend (not the offline mock) and persists across reload", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);

  // The offline mock (lib/mockAuth.ts) is the only path that writes this
  // specific key — its absence confirms a real backend authenticated this
  // session, regardless of which of the two real tiers is currently active.
  const mockSessionKey = await page.evaluate(() => localStorage.getItem("hanbeelms.session"));
  expect(mockSessionKey).toBeFalsy();

  await page.reload();
  await expect(page).toHaveURL(/\/student\/dashboard$/);
  await expect(page.getByRole("button", { name: "Account menu for Ava Chen" })).toBeVisible();
});

test("wrong password against the real backend shows invalid-credentials, not a crash", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("a staff-posted announcement reaches a student session via the real backend", async ({ page, browser }) => {
  const staffPage = await (await browser.newContext()).newPage();
  await staffPage.goto("/login");
  await staffPage.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await staffPage.getByLabel("Password").fill("staff123");
  await staffPage.getByRole("button", { name: "Sign in" }).click();
  await expect(staffPage).toHaveURL(/\/staff\/dashboard$/);

  await staffPage.goto("/staff/announcements");
  await staffPage.getByRole("button", { name: "+ New announcement" }).click();
  const uniqueTitle = `Backend delivery check ${Date.now()}`;
  await staffPage.getByPlaceholder("Announcement title").fill(uniqueTitle);
  await staffPage.getByPlaceholder("Write your announcement…").fill("Posted via the real backend integration test.");
  await staffPage.getByRole("button", { name: "Post" }).click();
  await expect(staffPage.getByText(uniqueTitle)).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);
  await page.goto("/student/announcements");
  await expect(page.getByText(uniqueTitle)).toBeVisible();
});
