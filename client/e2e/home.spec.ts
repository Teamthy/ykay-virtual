import { test, expect } from "@playwright/test";

/** Public marketing home — no API, no seed. */
test.describe("virtual home", () => {
  test("hero headline and moving programme rail are present", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.getByRole("heading", {
        name: /Comprehensive Learning\s+Solutions for Every Student/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Junior/i }).first()).toBeVisible();
  });

  test("campus bridge points at Ykay College", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/The Ykay family · Campus/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Visit Ykay College/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /About campus/i })).toHaveAttribute("href", "/college");
  });

  test("about founder portrait is full-bleed, tall, and top-aligned", async ({ page }) => {
    await page.goto("/about");
    const founder = page.locator('section[aria-labelledby="founder-heading"]');
    const portrait = founder.getByRole("img", { name: /Yinka Oladimeji/i });
    await expect(portrait).toBeVisible();
    const bounds = await founder.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual((page.viewportSize()?.width ?? 1280) - 8);
    expect(bounds?.height).toBeGreaterThanOrEqual((page.viewportSize()?.width ?? 1280) >= 1024 ? 760 : 520);
    const imageStyle = await portrait.evaluate((img) => ({
      fit: getComputedStyle(img).objectFit,
      position: getComputedStyle(img).objectPosition,
    }));
    expect(imageStyle.fit).toBe("cover");
    expect(imageStyle.position).toMatch(/(?:^| )0%$|top$/);
  });

  test("home sections have full-bleed backgrounds", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize()?.width ?? 1280;
    // The redesign uses edge-to-edge section backgrounds with inner 1920px
    // containers. Sections need not all be a full viewport *tall*.
    const sections = page.locator("#main-content section");
    await expect(sections.first()).toBeVisible();
    const widths = await sections.evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).getBoundingClientRect().width),
    );
    expect(widths.length).toBeGreaterThan(3);
    for (const width of widths) expect(width).toBeGreaterThanOrEqual(viewport - 8);
  });
});
