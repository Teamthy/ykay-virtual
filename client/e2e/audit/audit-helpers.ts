// 10-user audit harness — shared helpers.
//
// Standalone evidence collector for docs/AUDIT_PRE_PRODUCTION_2026.md. It is
// deliberately NOT part of the CI gate: run it on demand with
//   AUDIT_HARNESS=1 API_LOG=/tmp/e2e-web-api.log npx playwright test e2e/audit
// against the stack booted by scripts/e2e-web.sh. Each step logs
// PASS/FAIL/DEGRADED and drops a screenshot under e2e/audit/.artifacts/
// (gitignored). Mirrors the proven patterns in e2e/axe.spec.ts: unique emails,
// API_BASE_URL probes, cookie-consent storageState.
import { APIRequestContext, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const API = process.env.API_BASE_URL || "http://localhost:8080/api/v1";
export const ARTIFACTS = path.join(__dirname, ".artifacts");

export function uniq(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

export type StepResult = "PASS" | "FAIL" | "DEGRADED";

/** Structured per-step log line (parsed by the report generator). */
export function step(user: string, name: string, result: StepResult, detail = ""): void {
  // eslint-disable-next-line no-console
  console.log(`AUDIT|${user}|${result}|${name}${detail ? `|${detail}` : ""}`);
}

export async function shot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

/** Collect console errors + failed network responses for a page session. */
export function captureErrors(page: Page): { errors: string[]; failed: string[] } {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => failed.push(`${r.method()} ${r.url()}`));
  page.on("response", (r) => {
    if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`);
  });
  return { errors, failed };
}

/** Register → verify (via API log token) → login → mark onboarded. Returns email. */
export async function registerVerifiedParent(
  api: APIRequestContext,
  password = "password123",
): Promise<{ email: string }> {
  const email = uniq("audit");
  const reg = await api.post(`${API}/auth/register`, {
    data: { email, password, roles: ["PARENT"] },
  });
  if (reg.status() !== 201) throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);

  const logPath = process.env.API_LOG || "/tmp/e2e-web-api.log";
  const before = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;
  const vr = await api.post(`${API}/auth/verify-email/request`, { data: { email } });
  if (vr.status() !== 200) throw new Error(`verify-request failed: ${vr.status()}`);
  let token = "";
  for (let i = 0; i < 40 && !token; i++) {
    try {
      const buf = fs.readFileSync(logPath);
      if (buf.length > before) {
        const tail = buf.subarray(before).toString("utf8");
        const m = [...tail.matchAll(/verify-email\?token=([^"&\s\\]+)/g)];
        if (m.length) token = decodeURIComponent(m[m.length - 1][1]);
      }
    } catch {
      /* not flushed yet */
    }
    if (!token) await new Promise((r) => setTimeout(r, 250));
  }
  if (!token) throw new Error("verification token not found in API log");
  const vc = await api.post(`${API}/auth/verify-email/confirm`, { data: { token } });
  if (vc.status() !== 200) throw new Error(`verify-confirm failed: ${vc.status()}`);
  await api.post(`${API}/auth/me/onboarded`);
  return { email };
}

/** Log a parent in through the real login form (sets the session cookie). */
export async function loginViaForm(page: Page, email: string, password = "password123"): Promise<void> {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press("Enter");
}
