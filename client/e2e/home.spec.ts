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
    await expect(page.getByRole("link", { name: /What is the campus school/i })).toBeVisible();
  });

  test("home sections are at least one viewport tall", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize()?.height ?? 720;
    // Wait for the sections before measuring — evaluateAll does not
    // auto-wait, and on a slow first paint it can observe an empty DOM
    // (hydration/streaming still settling) and measure zero sections.
    const sections = page.locator("#main-content section");
    await expect(sections.first()).toBeVisible();
    const heights = await sections.evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).offsetHeight),
    );
    expect(heights.length).toBeGreaterThan(3);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(viewport - 8);
  });
});
