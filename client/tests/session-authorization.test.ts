// G1 regression tests — client API layers must NEVER send fixture identity
// UUIDs or dev-auth headers. The actor is the httpOnly session cookie; profile
// IDs are session-resolved server-side.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Call = { url: string; init?: RequestInit };
const calls: Call[] = [];

function okEnvelope(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as Response;
}

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return okEnvelope([]);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("session-resolved portal API (G1)", () => {
  it("listMyAssignments omits student_profile_id by default", async () => {
    const { listMyAssignments } = await import("@/features/portal/api");
    await listMyAssignments();
    expect(calls[0].url).toContain("/me/assignments");
    expect(calls[0].url).not.toContain("student_profile_id");
  });

  it("listAvailability omits tutor_profile_id by default", async () => {
    const { listAvailability } = await import("@/features/portal/api");
    await listAvailability();
    expect(calls[0].url).toContain("/me/availability");
    expect(calls[0].url).not.toContain("tutor_profile_id");
  });

  it("getMyLessons omits student_profile_id by default", async () => {
    const { getMyLessons } = await import("@/features/lms/api");
    await getMyLessons();
    expect(calls[0].url).toContain("/me/lessons");
    expect(calls[0].url).not.toContain("student_profile_id");
  });

  it("messaging API sends no X-User-ID / X-User-Roles bridge headers", async () => {
    const { listConversations, sendMessage } = await import("@/features/messaging/api");
    await listConversations();
    await sendMessage("conv-1", "hello");
    for (const call of calls) {
      const headers = new Headers(call.init?.headers);
      expect(headers.get("X-User-ID")).toBeNull();
      expect(headers.get("X-User-Roles")).toBeNull();
    }
  });

  it("vetting API sends no bridge headers", async () => {
    const { getMyProfile } = await import("@/features/vetting/api");
    await getMyProfile();
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get("X-User-ID")).toBeNull();
    expect(headers.get("X-User-Roles")).toBeNull();
  });

  it("cohort booking body carries no parent_user_id (session-derived)", async () => {
    const { createCohortBooking } = await import("@/features/bookings/api/create");
    await createCohortBooking({
      cohort_id: "c-1",
      student_id: "0f9cd9a2-92be-4e6c-8e5c-0a5c2ce4a111",
      idempotency_key: "k-1",
    });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.parent_user_id).toBeUndefined();
    expect(body.student_id).toBe("0f9cd9a2-92be-4e6c-8e5c-0a5c2ce4a111");
  });
});

describe("no fixture UUIDs remain in client source", () => {
  it("startAssessment omits student_profile_id when not provided", async () => {
    const { startAssessment } = await import("@/features/learning/api");
    await startAssessment("a-1");
    expect(calls[0].url).not.toContain("student_profile_id");
  });

  it("apiFetch always attaches a trace id and credentials", async () => {
    const { apiFetch } = await import("@/lib/api");
    await apiFetch("/subjects");
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get("X-Trace-ID")).toBeTruthy();
    expect(calls[0].init?.credentials).toBe("include");
  });
});
