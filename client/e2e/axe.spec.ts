// G6.2 — automated accessibility gate on the core conversion + auth pages.
// Critical violations fail the run; serious ones are listed for the formal
// acceptance register (docs/UI_OPTIMIZATION_PLAN.md) with remediation dates.
import { test, expect, request, APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const API = process.env.API_BASE_URL || "http://localhost:8080/api/v1";

function uniq(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

test("no critical a11y violations on landing, login and dashboard", async ({ page, request }) => {
  // Landing
  await page.goto("/");
  let results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  const serious = results.violations.filter((v) => v.impact === "serious");
  console.log(`[/] axe: ${results.violations.length} violations (${critical.length} critical, ${serious.length} serious)`);
  for (const v of critical)
    console.log(`[/] CRITICAL: ${v.id} — targets: ${JSON.stringify(v.nodes.map((n) => n.target))}`);
  for (const v of serious.slice(0, 20)) console.log(`[/] serious: ${v.id} — ${v.nodes.length} node(s) on ${v.help}`);
  expect(critical, "critical violations on /").toEqual([]);

  // Login
  await page.goto("/login");
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "critical")).toEqual([]);

  // Dashboard (authenticated parent)
  const email = uniq("axe");
  const reg = await request.post(`${API}/auth/register`, {
    data: { email, password: "password123", roles: ["PARENT"] },
  });
  expect(reg.status()).toBe(201);
  const login = await request.post(`${API}/auth/login`, {
    data: { email, password: "password123" },
  });
  expect(login.status()).toBe(200);

  // Verify the account (the web client gates dashboards on verification).
  const vr = await request.post(`${API}/auth/verify-email/request`, { data: { email } });
  expect(vr.status()).toBe(200);
  const fs = await import("fs");
  const log = fs.readFileSync(process.env.API_LOG || "/tmp/e2e-web-api.log", "utf8");
  const matches = [...log.matchAll(/verify-email\?token=([^"&\s\\]+)/g)];
  expect(matches.length).toBeGreaterThan(0);
  const token = decodeURIComponent(matches[matches.length - 1][1]);
  const vc = await request.post(`${API}/auth/verify-email/confirm`, { data: { token } });
  expect(vc.status()).toBe(200);

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("password123");
  await page.locator('input[type="password"]').press("Enter");
  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
  results = await new AxeBuilder({ page }).analyze();
  const crit = results.violations.filter((v) => v.impact === "critical");
  console.log(`[/dashboard] axe: ${results.violations.length} violations (${crit.length} critical)`);
  expect(crit, "critical violations on /dashboard").toEqual([]);
});
