// G6.1 — the REAL tutor experience, walked in a browser:
//   become-a-tutor apply (UI) → subjects (UI) → documents (UI) →
//   competency assessment (UI, answering the seeded bank) → submit for
//   review (UI) → admin review chain via the console APIs (review →
//   document approve → interview → verify → approve → public) →
//   tutor requests the demo cohort from the dashboard (UI) →
//   admin approves the join → the tutor lands on the cohort.
//
// Deterministic answers: BOTH e2e modes seed the mathematics bank with the
// correct answer at option index 1 (cmd/api memory seed + seed-refs.sql):
//   7×6=42 · 15% of 200=30 · 2x+4=12→4 · √144=12 · 3/4=0.75 · 6×9=54
import { test, expect, request, APIRequestContext } from "@playwright/test";
import fs from "fs";

const API = process.env.API_BASE_URL || "http://localhost:8080/api/v1";
const API_LOG = process.env.API_LOG || "/tmp/e2e-web-api.log";
const COHORT_ID = "00000000-0000-0000-0000-00000000c010";
const ADMIN_EMAIL = "e2e-admin@test.invalid";
const ADMIN_PASSWORD = "password123";

function uniq(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function adminSession(): Promise<APIRequestContext> {
  // Admin logins require an emailed MFA code — the dev console email sender
  // prints it to the API log (same pattern as the verify-email token).
  const ctx = await request.newContext();
  const login = await ctx.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, remember_me: false },
  });
  expect(login.status(), `admin login: ${await login.text()}`).toBe(200);
  const log = fs.readFileSync(API_LOG, "utf8");
  const match = [...log.matchAll(/MFA code for ([^\s"\\]+).*?:\s*(\d{6})/g)].at(-1);
  expect(match, "MFA code printed to API log").toBeTruthy();
  const confirm = await ctx.post(`${API}/auth/mfa/confirm`, {
    data: { email: ADMIN_EMAIL, code: match![2] },
  });
  expect(confirm.status(), `mfa confirm: ${await confirm.text()}`).toBe(200);
  return ctx;
}

test("become-a-tutor: full journey ends with the tutor assigned to a cohort", async ({ page }) => {
  const email = uniq("tutor");
  const password = "password123";

  // ── Account + login (API) ────────────────────────────────────────────────
  const api = await request.newContext();
  const reg = await api.post(`${API}/auth/register`, {
    data: { email, password, roles: ["TUTOR"] },
  });
  expect(reg.status(), `register: ${await reg.text()}`).toBe(201);
  const login = await api.post(`${API}/auth/login`, { data: { email, password } });
  expect(login.status(), "login").toBe(200);
  await api.post(`${API}/auth/me/onboarded`);

  // ── Apply (UI) ───────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press("Enter");
  await expect(page).toHaveURL(/tutor-dashboard/, { timeout: 20_000 });

  await page.goto("/become-tutor/apply");
  const form = page.locator("form").first();
  await form.locator("input").nth(0).fill(`E2E Tutor ${Date.now()}`);
  await form.locator("input").nth(1).fill("Mathematics · UTME");
  await form.locator("textarea").first().fill("E2E tutor journey — deterministic browser walk through the full vetting pipeline.");
  await form.locator('input[type="number"]').nth(0).fill("5");
  await form.locator('input[type="number"]').nth(1).fill("8000");
  await form.getByRole("button", { name: /create profile & continue/i }).click();
  await expect(page).toHaveURL(/become-tutor\/subjects/, { timeout: 20_000 });

  // ── Subjects (UI): Mathematics (the seeded bank's subject) ──────────────
  await page.getByRole("button", { name: /^mathematics$/i }).first().click();
  await page.getByRole("button", { name: /continue with 1 subject/i }).click();
  await expect(page).toHaveURL(/become-tutor\/documents/, { timeout: 20_000 });

  // ── Documents (UI): upload a stub ID file ────────────────────────────────
  await page.locator('input[type="file"]').setInputFiles({
    name: "national-id.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("e2e-dev-upload"),
  });
  await page.getByRole("button", { name: /upload & continue/i }).click();
  await page.getByRole("button", { name: /confirm & submit/i }).click();
  await expect(page).toHaveURL(/become-tutor\/assessment/, { timeout: 20_000 });

  // ── Assessment (UI): answer the seeded bank correctly ────────────────────
  // Subject button text differs per mode (real names in PG, placeholder in
  // memory) — click the first subject in the tutor's scope.
  const subjectBtn = page.locator("div.grid button").first();
  await expect(subjectBtn).toBeVisible({ timeout: 15_000 });
  await subjectBtn.click();
  await expect(page.getByText(/competency quiz/i)).toBeVisible({ timeout: 20_000 });
  const answers: [RegExp, string][] = [
    [/7\s*[×x]\s*6/, "42"],
    [/15%\s*of\s*200/, "30"],
    [/2x\s*\+\s*4\s*=\s*12/, "4"],
    [/square root of 144/, "12"],
    [/3\/4 as a decimal/, "0.75"],
    [/6\s*[×x]\s*9/, "54"],
  ];
  const questionBlocks = page.locator("div.rounded-xl.border.p-4");
  const count = await questionBlocks.count();
  expect(count, "5 questions rendered").toBe(5);
  for (let i = 0; i < count; i++) {
    const q = (await questionBlocks.nth(i).locator("p").first().textContent()) ?? "";
    const hit = answers.find(([re]) => re.test(q));
    expect(hit, `deterministic answer for: ${q}`).toBeTruthy();
    await questionBlocks.nth(i).getByText(hit![1], { exact: true }).click();
  }
  await page.getByRole("button", { name: /submit answers/i }).click();
  await expect(page.getByText(/you passed/i)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /^continue$/i }).click();

  // ── Submit for review (UI — the status page's submit button) ─────────────
  await expect(page).toHaveURL(/become-tutor\/status/, { timeout: 20_000 });
  await page.getByRole("button", { name: /submit application for review/i }).click();
  await expect(page.getByText(/Submitted/i).first()).toBeVisible({ timeout: 20_000 });

  // ── Admin review chain (console APIs) ────────────────────────────────────
  const admin = await adminSession();
  const queueRes = await admin.get(`${API}/admin/vetting/queue?status=SUBMITTED&page_size=50`);
  expect(queueRes.status(), `queue: ${await queueRes.text()}`).toBe(200);
  const queue = (await queueRes.json()).data as { id: string; display_name: string }[];
  const profile = queue.find((p) => p.display_name.startsWith("E2E Tutor "));
  expect(profile, "submitted profile in the admin queue").toBeTruthy();

  const detailRes = await admin.get(`${API}/admin/vetting/profiles/${profile!.id}`);
  const detail = (await detailRes.json()).data as { documents?: { id: string; status: string }[] };
  const govtDoc = (detail.documents ?? []).find((d) => d.status === "PENDING");
  if (govtDoc) {
    const docReview = await admin.post(`${API}/admin/vetting/documents/${govtDoc.id}/review`, {
      data: { approve: true },
    });
    expect(docReview.status(), `doc review: ${await docReview.text()}`).toBe(200);
  }

  for (const step of ["review", "interview", "verify", "approve"]) {
    const res = await admin.post(`${API}/admin/vetting/profiles/${profile!.id}/${step}`, { data: {} });
    expect(res.status(), `${step}: ${await res.text()}`).toBe(200);
  }
  await admin.post(`${API}/admin/vetting/profiles/${profile!.id}/public`, {
    data: { is_public: true },
  });

  // ── Tutor requests the demo cohort from the dashboard (UI) ───────────────
  await page.goto("/tutor-dashboard");
  await page.getByRole("button", { name: /cohorts/i }).first().click();
  await expect(page.getByText(/UTME 2026 Mastery/i).first()).toBeVisible({ timeout: 20_000 });
  const cohortRow = page
    .locator("div")
    .filter({ hasText: /UTME 2026 Mastery/i })
    .filter({ has: page.getByRole("button", { name: /request to join/i }) })
    .first();
  await cohortRow.getByRole("button", { name: /request to join/i }).click();
  await expect(page.getByText(/join request sent/i)).toBeVisible({ timeout: 20_000 });

  // ── Admin approves the join → the tutor lands on the cohort ──────────────
  const joinsRes = await admin.get(`${API}/admin/cohort-joins?status=PENDING`);
  const joins = ((await joinsRes.json()).data ?? []) as { id: string; cohort_id: string }[];
  const join = joins.find((j) => j.cohort_id === COHORT_ID);
  expect(join, "pending join request for the demo cohort").toBeTruthy();
  const approveJoin = await admin.post(`${API}/admin/cohort-joins/${join!.id}/review`, {
    data: { status: "APPROVED" },
  });
  expect(approveJoin.status(), `join approve: ${await approveJoin.text()}`).toBe(200);

  // The demo cohort now carries the tutor (both storage modes).
  const cohortsRes = await admin.get(`${API}/admin/cohorts?status=PUBLISHED&page_size=100`);
  expect(cohortsRes.status(), "admin cohorts").toBe(200);
  const cohorts = (await cohortsRes.json()).data as { id: string; tutor_profile_id: string | null }[];
  const demo = cohorts.find((c) => c.id === COHORT_ID);
  expect(demo, "demo cohort listed").toBeTruthy();
  expect(demo!.tutor_profile_id, "join approval assigns the tutor to the cohort").toBe(profile!.id);
});
