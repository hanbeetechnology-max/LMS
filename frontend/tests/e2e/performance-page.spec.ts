import { test, expect } from "@playwright/test";

test("staff performance page: shows stats, chart bars, and task list", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.getByRole("link", { name: "View full performance →" }).click();
  await expect(page).toHaveURL(/\/staff\/performance$/);

  await expect(page.getByRole("heading", { name: "Your performance" })).toBeVisible();
  await expect(page.getByText("tasks completed")).toBeVisible();

  const bars = page.getByRole("button", { name: /hours worked/ });
  await expect(bars).toHaveCount(10);

  await expect(page.getByText("Prepare Week 5 slides for Intro to Design")).toBeVisible();
  await expect(page.getByText("Update syllabus for Fall term")).toBeVisible();
});

test("staff performance page: hours chart and time log don't cause horizontal overflow at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
  await page.getByLabel("Password").fill("staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff\/dashboard$/);

  await page.goto("/staff/performance");
  await expect(page.getByRole("heading", { name: "Your performance" })).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

  // Time log's Clock in/out columns hide below sm, leaving Date/Hours/Status —
  // this must not clip the visible columns.
  await expect(page.getByText("On time").first()).toBeVisible();
});
