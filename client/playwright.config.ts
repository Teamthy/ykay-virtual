import { defineConfig } from "@playwright/test";

// G6.1 browser E2E — orchestrated by scripts/e2e-web.sh (which boots the API
// and the standalone Next server). Env overrides:
//   WEB_BASE_URL   (default http://localhost:3000)
//   API_BASE_URL   (default http://localhost:8080/api/v1)
//   WEBHOOK_SECRET (must match the API's PAYSTACK_SECRET)
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.WEB_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
});
