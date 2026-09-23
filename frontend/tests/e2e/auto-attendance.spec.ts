import { test, expect } from "@playwright/test";

// Verifies the real backend-computed attendance panel (see
// components/app/AutoAttendancePanel.tsx) shows up alongside — not merged
// into — the existing manual per-section attendance grids, on both the
// staff and student attendance pages.

test("student's own system attendance shows their real login session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);

  await page.goto("/student/attendance");
  await expect(page.getByRole("heading", { name: "System sign-ins" })).toBeVisible();
  await expect(page.getByText(/Signed in/).first()).toBeVisible();
  await expect(page.getByText(/Active now|Present|Left early/).first()).toBeVisible();
});

test("staff sees system attendance across users, separate from the manual roster grid", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/attendance");
  await expect(page.getByRole("heading", { name: "System attendance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark all present" })).toBeVisible();
  // AutoAttendancePanel fetches auto_attendance_sessions_effective live from
  // Supabase — a real network round trip, so this first waits (via a DOM-
  // attachment check, generous timeout) for the fetch to actually land.
  // This session's own login just above guarantees at least one row exists
  // by the time it does (AuthProvider creates/reuses her own attendance
  // session on every real sign-in).
  //
  // toBeAttached() rather than toBeVisible(): each row renders inside
  // components/ui/Reveal.tsx's StaggerItem, which stays opacity:0 until an
  // IntersectionObserver fires or a 1200ms setTimeout backstop does (see
  // that file's own FALLBACK_MS comment) — under this repo's heavy-parallel
  // e2e load (several real Chromium instances competing for CPU), confirmed
  // via body.innerText() during a captured failure that rows were already
  // in the DOM while toBeVisible() still failed: even that 1200ms backstop
  // can miss its own deadline when the tab's task queue itself is starved.
  // What this assertion means to check (that a real session actually
  // loaded) doesn't depend on the entrance animation finishing.
  await expect(page.getByText(/Signed in/).first()).toBeAttached({ timeout: 30_000 });
});
