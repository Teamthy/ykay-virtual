import { test, expect } from "@playwright/test";

/** Public marketing home — no API, no seed. */
test.describe("virtual home", () => {
  test("hero headline and moving programme rail are present", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.getByRole("heading", { name: /Comprehensive Learning for Every Student/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Junior/i }).first()).toBeVisible();
  });

  test("campus bridge points at Ykay College", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/The Ykay family · Campus/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Visit Ykay College/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /What is the campus school/i })).toBeVisible();
  });

  test("home sections are at least one viewport tall", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize()?.height ?? 720;
    const heights = await page.locator("main section, #main-content section").evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).offsetHeight),
    );
    expect(heights.length).toBeGreaterThan(3);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(viewport - 8);
  });
});
