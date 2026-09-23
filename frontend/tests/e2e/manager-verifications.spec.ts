import { test, expect } from "@playwright/test";

async function loginAsManager(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan@hanbeelms.edu");
  await page.getByLabel("Password").fill("manager123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/manager\/dashboard$/);
}

test("a row's expand state is reflected in aria-expanded, and collapses again on re-click", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/verifications");

  const row = page.getByRole("button", { name: /Isabella Cruz/ });
  await expect(row).toHaveAttribute("aria-expanded", "false");

  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Verify & Enroll" })).toBeVisible();

  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Verify & Enroll" })).toHaveCount(0);
});

test("verifying an applicant with complete details generates a roll number and shows an undo toast", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/verifications");

  await page.getByRole("button", { name: /Isabella Cruz/ }).click();
  await page.getByRole("button", { name: "Verify & Enroll" }).click();

  await expect(page.getByText(/Isabella Cruz verified — Roll No: STU-2026-\d{3}\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
});

test("clicking Undo reverts the verification", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/verifications");

  await page.getByRole("button", { name: /Isabella Cruz/ }).click();
  await page.getByRole("button", { name: "Verify & Enroll" }).click();
  await page.getByRole("button", { name: "Undo" }).click();

  const row = page.getByRole("button", { name: /Isabella Cruz/ });
  await expect(row.getByText("pending")).toBeVisible();
});

test("verifying an applicant missing required details shows an inline error instead of silently failing", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/verifications");

  await page.getByRole("button", { name: /Jamal Carter/ }).click();
  // Clear the institution field via inline-edit before attempting to verify.
  await page.getByRole("button", { name: /Institution/ }).click();
  await page.getByPlaceholder("Add institution").fill("");
  await page.getByPlaceholder("Add institution").press("Enter");

  await page.getByRole("button", { name: "Verify & Enroll" }).click();
  await expect(page.getByText("Age, institution, and phone are required before verifying.")).toBeVisible();
});

test("declining an applicant updates their status", async ({ page }) => {
  await loginAsManager(page);
  await page.goto("/manager/verifications");

  await page.getByRole("button", { name: /Jamal Carter/ }).click();
  await page.getByRole("button", { name: "Decline" }).click();

  await expect(page.getByText("Jamal Carter's application declined.")).toBeVisible();
  const row = page.getByRole("button", { name: /Jamal Carter/ });
  await expect(row.getByText("declined")).toBeVisible();
});
