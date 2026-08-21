// apiFetch contract — the client all money flows ride on: envelope errors
// surface as messages, trace headers are always sent, and the payout APIs
// post the exact payloads the backend expects.

import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { apiFetch } from "@/lib/api";
import { confirmPayoutPaid, finalizePaystackPayout, paystackPayout } from "@/features/admin/api";

const bodies: { url: string; body: unknown }[] = [];
const server = setupServer(
  http.post("/api/v1/admin/payouts/p1/paid", async ({ request }) => {
    bodies.push({ url: request.url, body: await request.json() });
    return HttpResponse.json({ data: { id: "p1" } });
  }),
  http.post("/api/v1/admin/payouts/p2/paystack", async ({ request }) => {
    bodies.push({ url: request.url, body: await request.json() });
    return HttpResponse.json({ data: { needs_otp: true, message: "otp" } });
  }),
  http.post("/api/v1/admin/payouts/p2/paystack/otp", async ({ request }) => {
    bodies.push({ url: request.url, body: await request.json() });
    return HttpResponse.json({ data: { id: "p2" } });
  }),
  http.get("/api/v1/error", () =>
    HttpResponse.json({ error: { code: "BAD_REQUEST", message: "boom" } }, { status: 400 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => bodies.length = 0);

describe("apiFetch envelope contract", () => {
  it("unwraps data and surfaces the error envelope message", async () => {
    await expect(apiFetch("/error")).rejects.toThrow("boom");
  });

  it("sends trace headers on every request", async () => {
    server.use(
      http.get("/api/v1/trace", ({ request }) => {
        expect(request.headers.get("X-Trace-ID")).toBeTruthy();
        expect(request.headers.get("X-Request-ID")).toBeTruthy();
        return HttpResponse.json({ data: { ok: true } });
      })
    );
    const res = await apiFetch("/trace");
    expect(res.data).toEqual({ ok: true });
  });
});

describe("payout API payloads", () => {
  it("confirmPayoutPaid posts the provider reference", async () => {
    await confirmPayoutPaid("p1", "TRF-001");
    expect(bodies[0].url).toContain("/admin/payouts/p1/paid");
    expect(bodies[0].body).toEqual({ provider_reference: "TRF-001" });
  });

  it("paystackPayout posts an empty body and reads needs_otp", async () => {
    const res = await paystackPayout("p2");
    expect(res.needs_otp).toBe(true);
    expect(bodies[0].url).toContain("/admin/payouts/p2/paystack");
  });

  it("finalizePaystackPayout posts the OTP", async () => {
    await finalizePaystackPayout("p2", "123456");
    expect(bodies[0].url).toContain("/paystack/otp");
    expect(bodies[0].body).toEqual({ otp: "123456" });
  });
});
