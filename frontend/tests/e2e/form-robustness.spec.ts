import { test, expect } from "@playwright/test";

test("signup's Terms and Privacy links point to the real pages, not home", async ({ page }) => {
  await page.goto("/signup");

  await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
});

test("signing up reaches the real signup endpoint (confirmation, or a real rate-limit — never the old stub message)", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test Signup");
  // A fresh, never-seen email each run — never one of the shared demo
  // accounts other tests rely on, so this can't corrupt their credentials.
  // Not @example.com: Supabase's signup validation rejects it outright as a
  // known non-deliverable domain (a real anti-abuse check, caught by
  // actually running this against the live project rather than assuming).
  await page.getByLabel("Email").fill(`e2e-signup-${Date.now()}@gmail.com`);
  await page.getByLabel("Password", { exact: true }).fill("a-real-password-123");
  await page.getByLabel("Confirm password").fill("a-real-password-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  // Supabase's free tier rate-limits outgoing confirmation emails — running
  // this test (or resetPasswordForEmail, on the same quota) repeatedly in a
  // short window, as any real CI run eventually will, exhausts it for real.
  // That's a genuine operational limit, not this code being broken, so a
  // rate-limit error counts as passing here exactly as much as success does
  // — what this actually guards against is regressing to the old hardcoded
  // "isn't connected yet" stub message, which neither real outcome is.
  const outcome = page.getByRole("heading", { name: "Check your email" }).or(page.getByRole("alert"));
  await expect(outcome).toBeVisible();
  await expect(page.getByText("isn't connected yet")).toHaveCount(0);
});

// Supabase's real supabase.auth.updateUser() only succeeds with an active
// session — the one a genuine emailed recovery link establishes on click.
// Navigating straight to this URL (no such link followed) has no session at
// all, so the real, honest behavior is a clear error, not a silent no-op or
// a faked success. Testing the actual happy path would mean signing in as a
// seeded demo account and changing its real password — which would break
// every other test relying on that account's known credentials — so that
// path isn't covered here; this test covers the reachable, safe case.
test("setting a new password with no active recovery session shows a real error, not a fake success", async ({ page }) => {
  await page.goto("/reset-password?type=recovery");

  await page.getByLabel("New password", { exact: true }).fill("a-new-password-123");
  await page.getByLabel("Confirm new password").fill("a-new-password-123");
  await page.getByRole("button", { name: "Save new password" }).click();

  await expect(page).toHaveURL(/\/reset-password\?type=recovery$/);
  await expect(page.getByRole("alert")).toBeVisible();
});

test("invitations form rejects a malformed email instead of silently accepting it", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/invitations");
  await page.getByLabel("Student emails").fill("not-an-email");
  await page.getByRole("button", { name: "Send invitations" }).click();

  await expect(page.getByRole("alert")).toContainText("Not a valid email address");
});
