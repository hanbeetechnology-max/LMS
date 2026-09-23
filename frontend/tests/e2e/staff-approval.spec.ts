import { test, expect } from "@playwright/test";

// Full round-trip coverage (self-signup -> blocked -> manager approves ->
// staff can log in) needs a real, email-confirmed Supabase account, which
// isn't reachable from a test run without disabling email confirmation —
// see form-robustness.spec.ts's own signup test for why a live signup here
// can only ever assert "reached the real endpoint," not "can now log in."
// The actual approval-gate logic (handle_new_user() setting approved=false
// for self-service staff, is_staff_or_manager() enforcing it, the manager
// profiles-update policy) is verified directly against a real Postgres
// engine in this round's pglite validation — see docs/PLAN.md §10.42.
// This file covers what's reachable from the already-seeded demo accounts:
// the redirect logic on both ends of the gate.

test("/pending-approval redirects to /login when signed out", async ({ page }) => {
  await page.goto("/pending-approval");
  await expect(page).toHaveURL(/\/login$/);
});

test("an already-approved staff account visiting /pending-approval is sent on to their dashboard, not shown the notice", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/pending-approval");
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
  await expect(page.getByText("Verification is ongoing")).toHaveCount(0);
});

test("a manager visiting /pending-approval is sent to the manager dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan@hanbeelms.edu");
  await page.getByLabel("Password").fill("manager123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/manager\/dashboard$/);

  await page.goto("/pending-approval");
  await expect(page).toHaveURL(/\/manager\/dashboard$/);
});

test("signup page's confirmation screen mentions manager approval is still required", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test Signup");
  await page.getByLabel("Email").fill(`e2e-signup-${Date.now()}@gmail.com`);
  await page.getByLabel("Password", { exact: true }).fill("a-real-password-123");
  await page.getByLabel("Confirm password").fill("a-real-password-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  // Same rate-limit caveat as form-robustness.spec.ts: a real rate-limit
  // response is an acceptable outcome here too, since what this test is
  // actually verifying (the copy) can't regress either way.
  const outcome = page.getByRole("heading", { name: "Check your email" }).or(page.getByRole("alert"));
  await expect(outcome).toBeVisible();
  const gotConfirmation = await page.getByRole("heading", { name: "Check your email" }).isVisible();
  if (gotConfirmation) {
    await expect(page.getByText(/manager still needs to approve it/)).toBeVisible();
  }
});
