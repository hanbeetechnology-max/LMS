import { test, expect, type Page } from "@playwright/test";

// A real WCAG contrast check (canvas-normalized, since getComputedStyle can
// return oklch()/rgb() depending on the browser — never trust the string
// format), not a screenshot eyeball. Runs against every leaf text node,
// walking up the DOM for the first non-transparent background.
async function findContrastFailures(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    function toRgb(colorStr: string): [number, number, number, number] {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    }
    function relLum([r, g, b]: number[]) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function effectiveBg(el: Element | null): [number, number, number, number] {
      let node = el;
      while (node) {
        const rgb = toRgb(getComputedStyle(node).backgroundColor);
        if (rgb[3] > 0.5) return rgb;
        node = node.parentElement;
      }
      return [255, 255, 255, 1];
    }
    const results: { text: string; ratio: number; threshold: number }[] = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (el.children.length > 0) return;
      const text = (el.textContent || "").trim();
      if (!text || text.length < 2) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || parseFloat(style.opacity) === 0) return;
      const fg = toRgb(style.color);
      const bg = effectiveBg(el);
      const L1 = relLum(fg) + 0.05;
      const L2 = relLum(bg) + 0.05;
      const ratio = L1 > L2 ? L1 / L2 : L2 / L1;
      const fontSize = parseFloat(style.fontSize);
      const fontWeight = parseInt(style.fontWeight) || 400;
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const threshold = isLarge ? 3 : 4.5;
      if (ratio < threshold) {
        results.push({ text: text.slice(0, 60), ratio: Math.round(ratio * 100) / 100, threshold });
      }
    });
    return results;
  });
}

test.describe("dark mode contrast — public pages", () => {
  test.use({ colorScheme: "dark" });

  for (const route of ["/", "/login", "/apply"]) {
    test(`no WCAG contrast failures on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForTimeout(1200);
      const failures = await findContrastFailures(page);
      expect(failures, JSON.stringify(failures)).toEqual([]);
    });
  }
});

test.describe("dark mode contrast — authenticated pages", () => {
  test.use({ colorScheme: "dark" });

  test("no WCAG contrast failures on the attendance marking grid (Present/Late pills)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
    await page.getByLabel("Password").fill("staff123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/staff\/dashboard$/);

    await page.goto("/staff/attendance");
    await page.waitForTimeout(1200);
    const failures = await findContrastFailures(page);
    expect(failures, JSON.stringify(failures)).toEqual([]);
  });

  test("no WCAG contrast failures on a pinned discussion thread", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("jamie@hanbeelms.edu");
    await page.getByLabel("Password").fill("staff123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/staff\/dashboard$/);

    await page.goto("/staff/forums");
    await page.waitForTimeout(1200);
    const failures = await findContrastFailures(page);
    expect(failures, JSON.stringify(failures)).toEqual([]);
  });
});
