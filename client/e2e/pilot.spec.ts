// G6.1 — browser pilot E2E: parent journey (register → learner → booking →
// webhook settlement → LMS), cross-family isolation, role tampering, and the
// public catalogue. All identities are generated per run (G1.3 rule: no
// fixture users); the seeded CATALOGUE rows (tutor 0102, cohort c010) are
// the marketplace fixtures shared with scripts/e2e.sh.
import { test, expect, request, APIRequestContext } from "@playwright/test";
import crypto from "crypto";

const API = process.env.API_BASE_URL || "http://localhost:8080/api/v1";
const SECRET = process.env.WEBHOOK_SECRET || "e2e-browser-secret";
const COHORT_ID = "00000000-0000-0000-0000-00000000c010";

function uniq(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

function hmac512(body: string): string {
  return crypto.createHmac("sha512", SECRET).update(body).digest("hex");
}

async function registerAndLogin(ctx: APIRequestContext, email: string, roles: string[]) {
  const reg = await ctx.post(`${API}/auth/register`, {
    data: { email, password: "password123", roles },
  });
  expect(reg.status(), `register ${email}: ${await reg.text()}`).toBe(201);
  const login = await ctx.post(`${API}/auth/login`, {
    data: { email, password: "password123" },
  });
  expect(login.status(), "login").toBe(200);
  // Returning-user path: complete the first-time wizard via the API so the
  // UI routes straight to the dashboard (the wizard has its own test).
  const ob = await ctx.post(`${API}/auth/me/onboarded`);
  expect(ob.status(), "mark onboarded").toBe(200);
}

async function uiLogin(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("password123");
  await page.locator('input[type="password"]').press("Enter");
  await expect(page).toHaveURL(/dashboard|student-dashboard/, { timeout: 20_000 });
}

// The web client redirects unverified accounts to /verify-email, so complete
// the real verification flow: request a code, read the link the dev console
// email sender prints to the API log, confirm with the token.
async function completeVerification(ctx: APIRequestContext, email: string) {
  const r = await ctx.post(`${API}/auth/verify-email/request`, { data: { email } });
  expect(r.status(), "verify request").toBe(200);
  const fs = await import("fs");
  const log = fs.readFileSync(process.env.API_LOG || "/tmp/e2e-web-api.log", "utf8");
  const matches = [...log.matchAll(/verify-email\?token=([^"&\s\\]+)/g)];
  expect(matches.length, "verification link printed to API log").toBeGreaterThan(0);
  const token = decodeURIComponent(matches[matches.length - 1][1]);
  const c = await ctx.post(`${API}/auth/verify-email/confirm`, { data: { token } });
  expect(c.status(), `verify confirm: ${await c.text()}`).toBe(200);
}

test("public catalogue renders seeded tutor and profile", async ({ page }) => {
  await page.goto("/tutors");
  await expect(page.getByText("Oluwatobi").first()).toBeVisible();

  // Batch-3 card design: vetted badge + subject teaching + message CTA.
  await expect(page.getByText("Vetted").first()).toBeVisible();
  await expect(page.getByText(/Teaches/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "message" }).first()).toBeVisible();
  // No contact details are ever exposed on the CARD (page chrome emails
  // like the footer contact address are legitimate).
  const card = page.locator("div").filter({ has: page.getByRole("link", { name: "message", exact: true }) }).first();
  await expect(card.getByText(/@/)).toHaveCount(0);

  // Inner-page hero uses the grid template (eyebrow pill + headline).
  await expect(page.getByRole("heading", { name: "Find your perfect tutor" })).toBeVisible();

  await page.goto("/tutors/oluwatobi");
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(/oluwatobi/i);
});

test("home page: batch-2 sections present, healthcare gone, exam cards link", async ({ page }) => {
  await page.goto("/");

  // Healthcare removed everywhere on the home page.
  await expect(page.getByText(/healthcare/i)).toHaveCount(0);
  await expect(page.getByText("We do home tutoring the right way")).toHaveCount(0);

  // Become-a-tutor section rebuilt on the requested template.
  await expect(page.getByText("Teach what you love.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply to teach" })).toBeVisible();

  // Download-on-the-go section.
  await expect(page.getByText("Your classroom, in your pocket.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Download for Android/ })).toBeVisible();

  // Exam prep cards link to their fully built pages (blue hover + CTA).
  const satCard = page.getByRole("link", { name: /SATs Prep/ });
  await expect(satCard).toBeVisible();
  await satCard.hover();
  await expect(satCard.getByText(/Get Started/)).toBeVisible();
  await expect(satCard).toHaveAttribute("href", "/sat");
});

test("parent pilot journey: register → learner → booking → webhook → LMS", async ({ page, request }) => {
  const email = uniq("pilot-parent");

  // Seed via API (same contract the UI uses).
  await registerAndLogin(request, email, ["PARENT"]);
  const learner = await request.post(`${API}/me/learners`, {
    data: {
      first_name: "Kemi", last_name: "Ade", date_of_birth: "2013-01-15",
      current_level: "JSS2", relationship: "MOTHER",
    },
  });
  expect(learner.status()).toBe(201);
  const sid = (await learner.json()).data.id;

  const booking = await request.post(`${API}/bookings`, {
    data: { type: "COHORT", cohort_id: COHORT_ID, student_id: sid, idempotency_key: `bw-${Date.now()}` },
  });
  expect(booking.status()).toBe(201);
  const oid = (await booking.json()).data.order.id;

  const init = await request.post(`${API}/payments/initiate`, {
    data: { order_id: oid, provider: "PAYSTACK", email },
  });
  expect(init.status()).toBe(201);
  const { provider_reference: ref, amount } = (await init.json()).data;

  // Signed webhook settles the order (kobo minor units for Paystack).
  const payload = JSON.stringify({
    event: "charge.success",
    data: { reference: ref, amount: Math.round(amount * 100), status: "success" },
  });
  const wh = await request.post(`${API}/payments/webhooks/PAYSTACK`, {
    data: payload,
    headers: { "Content-Type": "application/json", "X-Paystack-Signature": hmac512(payload) },
  });
  expect(wh.status()).toBe(200);

  // UI: sign in as the parent — the dashboard renders its bookings shell
  // and the settled enrolment shows up in the LMS hub.
  await completeVerification(request, email);
  await uiLogin(page, email);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Family dashboard/ })).toBeVisible();
  // Suggestions engine renders the "For you" shelf on the dashboard.
  await expect(page.getByRole("heading", { name: "For you" })).toBeVisible();

  // Personalized dashboard shell: marketing chrome must NOT appear here
  // (the homepage navbar stays on marketing pages only).
  await expect(page.getByRole("link", { name: "Programmes" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  await page.goto("/lms");
  await expect(page.getByText(/UTME 2026/i).first()).toBeVisible();

  // The checkout learner picker resolves the session's learners (G1.2).
  await page.goto(`/checkout/${COHORT_ID}`);
  await expect(page.locator("select").first()).toContainText("Kemi");
});

test("cross-family isolation: parent B cannot see parent A's learner", async ({ request }) => {
  await registerAndLogin(request, uniq("fam-a"), ["PARENT"]);
  const lr = await request.post(`${API}/me/learners`, {
    data: {
      first_name: "Amara", last_name: "Obi", date_of_birth: "2012-05-05",
      current_level: "JSS3", relationship: "FATHER",
    },
  });
  expect(lr.status()).toBe(201);

  // Switch session to parent B.
  await registerAndLogin(request, uniq("fam-b"), ["PARENT"]);
  const learnersB = await request.get(`${API}/me/learners`);
  expect(learnersB.status()).toBe(200);
  expect(JSON.stringify(await learnersB.json())).not.toContain("Amara");

  // Foreign learner ID is rejected outright (G1.3 tamper path).
  const sidA = (await lr.json()).data.id;
  const tamper = await request.get(`${API}/me/lessons?student_profile_id=${sidA}`);
  expect(tamper.status()).toBe(403);
});

test("student role cannot reach admin surfaces", async ({ page, request }) => {
  const email = uniq("stu");
  await registerAndLogin(request, email, ["STUDENT"]);

  const q = await request.get(`${API}/admin/support?category=SAFEGUARDING`);
  expect(q.status()).toBe(403);

  await completeVerification(request, email);
  await uiLogin(page, email);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText(/Hi|Welcome|Kemi|dashboard/i).first()).toBeVisible();
});

test("first-time wizard: 3 steps then the role dashboard", async ({ page, request }) => {
  const email = uniq("wizard");
  // Register + login WITHOUT marking onboarded — the wizard must appear.
  const reg = await request.post(`${API}/auth/register`, {
    data: { email, password: "password123", roles: ["PARENT"] },
  });
  expect(reg.status()).toBe(201);
  await completeVerification(request, email);

  // Fresh account (not onboarded) → login lands on the wizard.
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("password123");
  await page.locator('input[type="password"]').press("Enter");
  await expect(page).toHaveURL(/onboarding\/wizard/, { timeout: 20_000 });

  // Step 1 → 2: add the first learner.
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByPlaceholder("e.g. Kemi").fill("Wiz");
  await page.getByRole("button", { name: "JSS2" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3 → finish lands on the parent dashboard.
  await page.getByRole("button", { name: /Exam success/ }).click();
  // The button re-renders to a disabled "Saving…" while the finish POST is
  // in flight — click without waiting for navigation, then assert the URL.
  await page.getByRole("button", { name: /Finish/ }).click({ noWaitAfter: true });
  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Family dashboard/ })).toBeVisible();
});

test("become-a-tutor: marketing page + apply step creates the vetting profile", async ({ page, request }) => {
  const email = uniq("tutor-apply");
  // Register + verify + onboard a TUTOR via API (session cookie planted
  // below), then walk the real onboarding UI.
  const reg = await request.post(`${API}/auth/register`, {
    data: { email, password: "password123", roles: ["TUTOR"] },
  });
  expect(reg.status()).toBe(201);
  await completeVerification(request, email);
  // Log in via the API (session cookie jar) BEFORE marking onboarded —
  // the endpoint requires an authenticated session.
  const login = await request.post(`${API}/auth/login`, {
    data: { email, password: "password123" },
  });
  expect(login.status()).toBe(200);
  const ob = await request.post(`${API}/auth/me/onboarded`);
  expect(ob.status(), "mark tutor onboarded").toBe(200);

  // Marketing page (public, no session needed).
  await page.goto("/become-tutor");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  // Sign in, then start the application.
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("password123");
  await page.locator('input[type="password"]').press("Enter");
  await expect(page).toHaveURL(/tutor-dashboard/, { timeout: 20_000 });

  await page.goto("/become-tutor/apply");
  await page.getByLabel("Display name").fill("Ade Tutor");
  await page.getByLabel("Headline").fill("Mathematics & Physics specialist");
  await page.getByLabel("Bio").fill("Five years teaching WAEC and IGCSE maths.");
  await page.getByRole("button", { name: /Create profile & continue/ }).click({ noWaitAfter: true });
  await expect(page).toHaveURL(/become-tutor\/subjects/, { timeout: 20_000 });
  await expect(page.getByText(/subjects/i).first()).toBeVisible();
});

test("page sweep: every public surface renders (no application errors)", async ({ page }) => {
  const routes = [
    "/", "/tutors", "/cohorts", "/programmes", "/subjects", "/pricing",
    "/how-it-works", "/about", "/contact", "/become-tutor", "/hometutors",
    "/private-tuition", "/exam-prep", "/test-prep", "/study-abroad",
    "/nuvora-plus", "/for-schools", "/online-classes", "/digital-skills",
    "/entrance-exam", "/utme-2026", "/success-stories", "/download",
    "/login", "/register",
  ];
  for (const route of routes) {
    const errors: string[] = [];
    const onError = (e: Error) => errors.push(String(e));
    page.on("pageerror", onError);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const body = await page.content();
    if (body.includes("Application error")) errors.push(`${route}: app error`);
    const heading = await page.getByRole("heading", { level: 1 }).count();
    if (heading === 0) errors.push(`${route}: no h1`);
    page.off("pageerror", onError);
    expect(errors, errors.join("; ")).toEqual([]);
  }
});
