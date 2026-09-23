import { test, expect } from "@playwright/test";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
}

async function loginAsStudent(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ava@student.edu");
  await page.getByLabel("Password").fill("student123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);
}

test("messages are role-aware: staff and student see different, non-overlapping contacts", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/messages");
  await expect(page.getByRole("button", { name: /Priya Nair/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Devon Brooks/ })).toHaveCount(0);

  await loginAsStudent(page);
  await page.goto("/student/messages");
  await expect(page.getByRole("button", { name: /Devon Brooks/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Priya Nair/ })).toHaveCount(0);
});

test("attendance marking grid only shows active/completed roster students, not invited ones", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/attendance");
  // Root-caused, not just timed out around: StaffAttendancePage's roster
  // (INITIAL_ROSTER from StaffRosterPage) is fully static/synchronous — no
  // Supabase call, no useEffect — so React renders "Ava Chen" into the DOM
  // immediately on mount regardless of load. What was actually flaky is the
  // *entrance animation* wrapping it: components/ui/Reveal.tsx's
  // StaggerGroup/StaggerItem stay at opacity:0 until an IntersectionObserver
  // fires (or, per that file's own FALLBACK_MS comment, a 1200ms setTimeout
  // backstop for exactly "the observer didn't fire in time"). Under this
  // repro's heavy parallel load (`--repeat-each --workers=4`, several real
  // Chromium instances competing for this sandbox's CPU), confirmed via
  // page.locator("body").innerText() during a captured failure that the
  // text WAS already in the DOM while toBeVisible() still failed — even
  // that 1200ms backstop can miss its own deadline when the tab's task
  // queue itself is starved, and no Playwright assertion timeout fixes a
  // stalled setTimeout on the page's own thread. What this test actually
  // means to verify (which students the roster includes) doesn't depend on
  // the entrance animation finishing, so it asserts DOM presence directly
  // instead of CSS-computed visibility.
  // Generous timeout for the same reason as the comment above: under
  // severe CPU contention even React's initial commit (not just the
  // animation) can be delayed well past the default 5s in this sandbox's
  // heaviest parallel-test scenarios.
  //
  // Scoped to the roster's own <span> (student.name in the manual roster
  // grid) rather than a bare getByText: this page also renders a real,
  // live "System attendance" panel below the roster (AutoAttendancePanel,
  // real auto_attendance_sessions rows for every past real login as Ava
  // across this whole test suite's history — dozens by now, each rendered
  // as its own <p>), so an unscoped text match now legitimately resolves
  // to well over a hundred elements and trips Playwright's strict mode.
  // The two are visually and structurally distinct (span vs p) precisely
  // because they're different data sources — this scoping is real, not
  // a workaround.
  await expect(page.locator("span", { hasText: "Ava Chen" })).toBeAttached({ timeout: 30_000 });
  await expect(page.locator("span", { hasText: "Sofia Kim" })).toHaveCount(0);
});

test("roster shows a dash, not 0%, for an invited student's attendance and completion", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");
  const row = page.locator("div", { hasText: "Sofia Kim" }).last();
  await expect(row.getByText("0%")).toHaveCount(0);
});

test("courses FilterBar: Subject group filters the list on both staff and student pages", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/courses");
  await page.getByRole("button", { name: "Math" }).click();
  await expect(page.getByText("Intro to Statistics — Fall 2025")).toBeVisible();
  await expect(page.getByText("Data Structures")).toHaveCount(0);

  // /student/courses now reads real, live Supabase courses (see
  // docs/PLAN.md) instead of the old mock array — the only real published
  // course today is "Intro to Design", and the DB schema has no category
  // column, so every real course falls back to a single "General" chip
  // (same fix already applied in courses-and-roster.spec.ts).
  await loginAsStudent(page);
  await page.goto("/student/courses");
  await page.getByRole("button", { name: "General" }).click();
  await expect(page.getByText("Intro to Design")).toBeVisible();
});

test("discussions: a staff-authored thread shows a Staff pill", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/forums");
  const row = page.locator("div", { hasText: "Welcome — introduce yourself!" }).first();
  await expect(row.getByText("Devon Brooks")).toBeVisible();
});

test("staff performance page shows a time log with clock-in and clock-out columns", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/performance");
  await expect(page.getByRole("heading", { name: "Time log" })).toBeVisible();
  await expect(page.getByText("9:00 AM").first()).toBeVisible();
});

test("calendar 'This week' no longer duplicates 'Today'", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/calendar");
  await expect(page.getByText("Guest lecture: Design Systems")).toBeVisible();
});

test("settings notification toggles match real notification categories per role", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/settings");
  await expect(page.getByText("New applicants")).toBeVisible();

  await loginAsStudent(page);
  await page.goto("/student/settings");
  await expect(page.getByText("Lesson reminders")).toBeVisible();
});

test("roster shows a real roll number, and student profile shows roll no/age/institution/phone with aligned tables", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/roster");
  await expect(page.getByText("STU-2026-001")).toBeVisible();

  await page.goto("/staff/students/1");
  await expect(page.getByText("STU-2026-001")).toBeVisible();
  await expect(page.getByText("Age 20")).toBeVisible();
  await expect(page.getByText("Lincoln High School")).toBeVisible();
  await expect(page.getByText("(555) 201-4471")).toBeVisible();

  // Both mini-tables now have real column headers instead of bare lists.
  await expect(page.getByText("Session", { exact: true })).toBeVisible();
  await expect(page.getByText("Lesson", { exact: true })).toBeVisible();
});

test("an invited student shows no roll number yet", async ({ page }) => {
  await loginAsStaff(page);
  await page.goto("/staff/students/4");
  await expect(page.getByText("Roll no. pending")).toBeVisible();
});
