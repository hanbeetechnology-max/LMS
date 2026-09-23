import { test, expect } from "@playwright/test";

test("a component that throws while rendering is caught and shows the recoverable fallback", async ({ page }) => {
  await page.goto("/__dev/crash-test");

  await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
});
