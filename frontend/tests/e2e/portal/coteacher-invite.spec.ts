import { expect, test } from "@playwright/test";

// The owner can invite a co-teacher and get that person's personal link (no
// email is sent by the platform). The invitation is revoked afterwards so
// nothing stays pending on the shared database.
test("owner invites a co-teacher and gets a working personal link", async ({ page }) => {
  const email = `test-coteacher-${Date.now()}@hanbee.test`;

  await page.goto("/login");
  await page.getByLabel(/email/i).fill("demo.owner1@hanbee.test");
  await page.getByLabel(/^password/i).fill("Demo#12345");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/school\/overview/);
  await page.getByRole("link", { name: /^students$/i }).first().click();
  await expect(page).toHaveURL(/\/school\/students/);

  await page.getByLabel("Teacher email").fill(email);
  await page.getByRole("button", { name: "Invite teacher" }).click();
  await expect(page.getByText(`Invited ${email}`)).toBeVisible();

  const row = page.locator("li", { hasText: email });
  await expect(row.getByRole("button", { name: "Copy invitation link" })).toBeVisible();
  const mail = await row.getByRole("link", { name: "Open in mail app" }).getAttribute("href");
  expect(mail).toContain("mailto:");
  expect(decodeURIComponent(mail ?? "")).toContain("/accept-invite?token=");

  // Clean up: revoke the pending invitation (two steps: Revoke, then Confirm revoke).
  await page.getByRole("button", { name: `Revoke invitation for ${email}` }).click();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(page.getByText(`Invitation for ${email} revoked`)).toBeVisible();
});
