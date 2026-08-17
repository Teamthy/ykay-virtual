// Auth friction E2E — signup + login journeys end to end.
//  1. login honors ?next= and returns to the page the user came for
//  2. open-redirect is blocked; wrong password shows a friendly error
//  3. full 7-step signup: account -> emailed code -> role -> profile ->
//     done, landing back on the ?next= target; next login skips the wizard
//  4. passwordless login-code flow honors ?next= too
import { test, expect, request, APIRequestContext } from "@playwright/test";

const API = process.env.API_BASE_URL || "http://localhost:8080/api/v1";
const LOG = process.env.API_LOG || "/tmp/e2e-web-api.log";

function uniq(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

/** Polls the dev-logged email sender for the 6-digit login code for email. */
async function readLoginCode(email: string): Promise<string> {
  const fs = await import("fs");
  const esc = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`login code for ${esc}: (\\d{6})`, "g");
  const deadline = Date.now() + 20_000;
  let code = "";
  while (Date.now() < deadline) {
    try {
      const log = fs.readFileSync(LOG, "utf8");
      const matches = [...log.matchAll(re)];
      if (matches.length) {
        code = matches[matches.length - 1][1];
        break;
      }
    } catch {
      /* log not flushed yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  expect(code, `login code for ${email} found in API log`).toMatch(/^\d{6}$/);
  return code;
}

/** Registers + verifies + marks onboarded via API so UI tests can focus. */
async function readyAccount(ctx: APIRequestContext, email: string, roles: string[] = ["PARENT"]) {
  const reg = await ctx.post(`${API}/auth/register`, { data: { email, password: "password123", roles } });
  expect(reg.status(), `register ${email}: ${await reg.text()}`).toBe(201);
  const vr = await ctx.post(`${API}/auth/verify-email/request`, { data: { email } });
  expect(vr.status(), "verify request").toBe(200);
  const fs = await import("fs");
  const log = fs.readFileSync(LOG, "utf8");
  const matches = [...log.matchAll(/verify-email\?token=([^"&\s\\]+)/g)];
  expect(matches.length, "verification link in API log").toBeGreaterThan(0);
  const token = decodeURIComponent(matches[matches.length - 1][1]);
  const vc = await ctx.post(`${API}/auth/verify-email/confirm`, { data: { token } });
  expect(vc.status(), "verify confirm").toBe(200);
  const login = await ctx.post(`${API}/auth/login`, { data: { email, password: "password123" } });
  expect(login.status(), "login").toBe(200);
  const ob = await ctx.post(`${API}/auth/me/onboarded`);
  expect(ob.status(), "mark onboarded").toBe(200);
}

async function uiLogin(page: import("@playwright/test").Page, email: string, password = "password123") {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press("Enter");
}

test("login honors ?next= and already-signed-in visits skip the form", async ({ page, request }) => {
  const email = uniq("deep-link");
  await readyAccount(request, email);

  // Not signed in: log in from a deep link → land back on the gated page.
  await page.goto("/login?next=/account");
  await uiLogin(page, email);
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  // Already signed in: visiting /login goes straight to the destination.
  await page.goto("/login?next=/cohorts");
  await expect(page).toHaveURL(/\/cohorts/, { timeout: 20_000 });
});

test("open redirect is blocked and wrong passwords explain themselves", async ({ page, request }) => {
  const email = uniq("open-redirect");
  await readyAccount(request, email);

  await page.goto("/login?next=https://evil.example");
  await uiLogin(page, email, "wrong-password");
  await expect(page.getByText(/incorrect/i).first()).toBeVisible();

  await uiLogin(page, email);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page).not.toHaveURL(/evil\.example/);
});

test("signup: full 7-step onboarding with the emailed code, back to ?next=", async ({
  page,
  browser,
}) => {
  const email = uniq("signup");

  await page.goto("/onboarding?next=/account");

  // Step 1 — account.
  await page.locator("#ob-name").fill("Test Parent");
  await page.locator("#ob-email").fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Step 2 — the code is auto-sent when the step opens (friction-free);
  // pull it from the dev-logged email sender and let auto-verify fire.
  const code = await readLoginCode(email);
  await page.locator("#ob-code").fill(code);
  await expect(page.getByText(/How are you planning to use NUVORA/)).toBeVisible({ timeout: 20_000 });

  // Step 3 — role.
  await page.getByRole("button", { name: /^Parent/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Step 4 — learner details (child fields appear once "My child" is chosen).
  await page.getByRole("button", { name: "My child", exact: true }).click();
  await page.locator("#ob-child").fill("Kemi");
  await page.getByRole("button", { name: "Secondary", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Step 5 — phone + password.
  await page.locator("#ob-phone").fill("+2348000000000");
  await page.locator("#ob-pw").fill("password123");
  await page.locator("#ob-pw2").fill("password123");
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Step 6 — about (optional) → done.
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.getByRole("button", { name: "Go to my dashboard" }).click();

  // The deep link target survives the whole signup journey.
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });

  // A brand-new session must go straight to the dashboard — never the wizard.
  const ctx2 = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: new URL(process.env.WEB_BASE_URL || "http://localhost:3000").origin,
          localStorage: [{ name: "nuvora-cookie-consent", value: "e2e" }],
        },
      ],
    },
  });
  const page2 = await ctx2.newPage();
  await page2.goto("/login");
  await uiLogin(page2, email);
  await expect(page2).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page2).not.toHaveURL(/wizard/);
  await ctx2.close();
});

test("passwordless login-code honors ?next=", async ({ page, request }) => {
  const email = uniq("login-code");
  await readyAccount(request, email);

  await page.goto("/login-code?next=/account");
  await page.locator('input[type="email"]').fill(email);
  await page.getByRole("button", { name: "Send login code" }).click();

  const code = await readLoginCode(email);
  await page.locator('input[inputmode="numeric"]').fill(code);
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
});
