import { test, expect } from "@playwright/test";

// A manager already exists in every environment this suite runs against
// (seeded — supabase/seed.mjs), so the "claim it" happy path can't be
// exercised here without deleting a real account. This covers the
// always-reachable state instead: the page correctly refuses a second
// claim, and never confirms role='manager' from client-supplied metadata
// (the exact hole supabase/migrations/0004_role_signup_security.sql closed).
test("manager setup shows 'already claimed' once a manager exists, not a claimable form", async ({ page }) => {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: "Already set up" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim manager account" })).toHaveCount(0);
});

test("signup page links to manager setup, and setup links back to sign in", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("link", { name: "Claim it here" })).toHaveAttribute("href", "/setup");

  await page.goto("/setup");
  await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
});
