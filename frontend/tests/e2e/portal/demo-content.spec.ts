import { test, expect, type Page } from "@playwright/test";

// Proves every sidebar page of every role shows real demo content (not an empty,
// error or loading state) and saves a full-page screenshot of each.
// Only runs after `node seed-demo.mjs && node seed-demo-full.mjs` with DEMO_CONTENT=1:
//   DEMO_CONTENT=1 npx playwright test tests/e2e/portal/demo-content.spec.ts --workers=1
test.skip(process.env.DEMO_CONTENT !== "1", "set DEMO_CONTENT=1 to check the demo data on every page");

type PageCheck = { name: string; path: string; expect: (string | RegExp)[] };
type RoleCheck = { role: string; email: string; password: string; pages: PageCheck[] };

const ROLES: RoleCheck[] = [
  {
    role: "student", email: "demo.s1@hanbee.test", password: "Demo#12345",
    pages: [
      { name: "rc-overview", path: "/student/rc", expect: ["Hanbee RC Cup 2026", "Alpha Racers"] },
      { name: "rc-leaderboard", path: "/student/rc/leaderboard", expect: ["Alpha Racers"] },
      { name: "rc-team", path: "/student/rc/team", expect: ["Alpha Racers", "Diya Menon"] },
      { name: "lms-overview", path: "/student/lms", expect: ["RC Car Basics (demo)"] },
      { name: "lms-courses", path: "/student/lms/courses", expect: ["RC Car Basics (demo)", "Race Strategy (demo)", "Intro to Design"] },
      { name: "lms-attendance", path: "/student/lms/attendance", expect: [/present/i, /absent|late|excused/i] },
      { name: "lms-ai", path: "/student/lms/ai", expect: [/assistant/i] },
      { name: "announcements", path: "/student/announcements", expect: ["Welcome to HANBEE (demo)", "New course: RC Car Basics (demo)", "Team kit collection (demo)"] },
      { name: "chat", path: "/student/chat", expect: ["Anita Rao", "Jamie Rivera"] },
      { name: "settings", path: "/student/settings", expect: ["Change password"] },
    ],
  },
  {
    role: "school-owner", email: "demo.owner1@hanbee.test", password: "Demo#12345",
    pages: [
      { name: "overview", path: "/school/overview", expect: ["Demo Public School", "Alpha Racers"] },
      { name: "students", path: "/school/students", expect: ["Aarav Kumar", "Kabir Shah", "demo.invitee1@hanbee.test"] },
      { name: "teams", path: "/school/teams", expect: ["Alpha Sprint"] },
      { name: "courses", path: "/school/courses", expect: ["RC Car Basics (demo)", "Intro to Design"] },
      { name: "announcements", path: "/school/announcements", expect: ["Team kit collection (demo)", "Parent meeting on Saturday (demo)"] },
      { name: "schedule", path: "/school/schedule", expect: [/Inter-house practice \(demo\)|Prepare team kits \(demo\)|RC Car Basics live class \(demo\)/] },
      { name: "tasks", path: "/school/tasks", expect: ["Collect consent forms (demo)", "Book the lab for practice (demo)"] },
      { name: "chat", path: "/school/chat", expect: ["Aarav Kumar", "Jamie Rivera"] },
      { name: "settings", path: "/school/settings", expect: ["Change password"] },
    ],
  },
  {
    role: "hanbee-staff", email: "jamie@hanbeelms.edu", password: "staff123",
    pages: [
      { name: "my-space", path: "/staff/my-space", expect: ["Review course applications (demo)"] },
      { name: "attendance", path: "/staff/attendance", expect: [/late/i, /present/i] },
      { name: "tournament", path: "/staff/tournament", expect: ["Hanbee RC Cup 2026", "Alpha Sprint", "Hanbee Winter Cup (demo)"] },
      { name: "lms", path: "/staff/lms", expect: ["RC Car Basics (demo)"] },
      { name: "schools", path: "/staff/schools", expect: ["Demo Public School", "Sample Academy", "Riverside School (demo)"] },
      { name: "courses", path: "/staff/courses", expect: ["RC Car Basics (demo)", "Race Strategy (demo)", "Intro to Design"] },
      { name: "applications", path: "/staff/applications", expect: ["Kabir Shah", "Sana Khan"] },
      { name: "announcements", path: "/staff/announcements", expect: ["Welcome to HANBEE (demo)", "Holiday schedule for October (demo)"] },
      { name: "schedule", path: "/staff/schedule", expect: [/RC Car Basics live class \(demo\)|Review applications \(demo\)|Office hours: Race Strategy \(demo\)/] },
      { name: "tasks", path: "/staff/tasks", expect: ["Review course applications (demo)", "Verify Alpha Sprint payment (demo)"] },
      { name: "chat", path: "/staff/chat", expect: ["Aarav Kumar", "Morgan"] },
      { name: "settings", path: "/staff/settings", expect: ["Change password"] },
    ],
  },
  {
    role: "manager", email: "morgan@hanbeelms.edu", password: "manager123",
    pages: [
      { name: "monitor", path: "/manager/monitor", expect: ["Needs your attention", "Schools active"] },
      { name: "verifications", path: "/manager/verifications", expect: [/Schools waiting|Nothing waiting for you/] },
      { name: "schools", path: "/manager/schools", expect: ["Demo Public School", "Sample Academy", "Riverside School (demo)"] },
      { name: "staff", path: "/manager/staff", expect: ["Jamie Rivera", "Priya Nair"] },
      { name: "announcements", path: "/manager/announcements", expect: ["Holiday schedule for October (demo)", "Staff meeting on Monday, 10 AM (demo)"] },
      { name: "schedule", path: "/manager/schedule", expect: ["Inter-house practice (demo)"] },
      { name: "tasks", path: "/manager/tasks", expect: ["Approve staff application (demo)", "Renew track booking (demo)"] },
      { name: "chat", path: "/manager/chat", expect: ["Jamie Rivera", "Anita Rao"] },
      { name: "settings", path: "/manager/settings", expect: ["Change password"] },
    ],
  },
];

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

for (const r of ROLES) {
  test(`demo content: ${r.role}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page, r.email, r.password);
    for (const p of r.pages) {
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      // wait for loading blocks to go away
      await expect(page.getByText(/^Loading/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => undefined);
      for (const e of p.expect) {
        await expect.soft(page.getByText(e).first(), `${r.role} ${p.name} should show ${String(e)}`).toBeVisible({ timeout: 6_000 });
      }
      await expect.soft(page.getByText(/something went wrong|could not be loaded|failed to load|unexpected error/i), `${r.role} ${p.name} error state`).toHaveCount(0);
      await page.screenshot({ path: `test-results/demo/${r.role}-${p.name}.png`, fullPage: true });
    }
  });
}
