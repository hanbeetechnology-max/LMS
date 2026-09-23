import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: {
    baseURL: "http://localhost:5175",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  // backend/'s FastAPI prototype is retired as of docs/PLAN.md §10.40 —
  // AuthProvider no longer has a tier that calls it, so it doesn't need to
  // be running for any test anymore. Only the frontend dev server remains.
  webServer: {
    command: "npm run dev -- --port 5175 --strictPort",
    url: "http://localhost:5175",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
