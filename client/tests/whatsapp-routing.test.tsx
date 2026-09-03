// WhatsApp button + role routing — the live-chat channel must never hardcode
// a number, and dashboard routing must keep roles on their own surfaces
// (RBAC boundaries).

import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WhatsAppButton,
  whatsAppHref,
} from "@/components/layout/WhatsAppButton";
import {
  homeForRoles,
  isAdmin,
  DASHBOARD_ROLES,
} from "@/hooks/useDashboardRoute";

const server = setupServer(
  http.get("/api/v1/site/contact", () =>
    HttpResponse.json({
      data: {
        whatsapp_number: "2348012345678",
        whatsapp_link: "https://wa.me/2348012345678",
      },
    }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("whatsAppHref", () => {
  it("appends the prefill message to the wa.me link", () => {
    const href = whatsAppHref(
      "https://wa.me/2348012345678",
      "Hello YK-Virtual!",
    );
    expect(href).toBe("https://wa.me/2348012345678?text=Hello+YK-Virtual%21");
  });

  it("returns the raw link when no prefill is given", () => {
    expect(whatsAppHref("https://wa.me/2348012345678")).toBe(
      "https://wa.me/2348012345678",
    );
  });
});

describe("WhatsAppButton", () => {
  it("renders a wa.me live-chat link loaded from the contact endpoint", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <WhatsAppButton prefill="Hello!" />
      </QueryClientProvider>,
    );
    const link = await screen.findByRole("link", {
      name: /chat with us on whatsapp/i,
    });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/2348012345678"),
    );
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("role → dashboard routing (RBAC)", () => {
  it("routes each role to its own home", () => {
    expect(homeForRoles(["SUPER_ADMIN"])).toBe("/admin");
    expect(homeForRoles(["ACADEMIC_ADMIN"])).toBe("/admin");
    expect(homeForRoles(["TUTOR"])).toBe("/tutor-dashboard");
    expect(homeForRoles(["STUDENT"])).toBe("/student-dashboard");
    expect(homeForRoles(["PARENT"])).toBe("/dashboard");
  });

  it("treats INSTITUTION_ADMIN as non-platform admin (YK-008)", () => {
    expect(isAdmin(["INSTITUTION_ADMIN"])).toBe(false);
    expect(homeForRoles(["INSTITUTION_ADMIN"])).not.toBe("/admin");
  });

  it("keeps dashboard surfaces role-scoped", () => {
    expect(DASHBOARD_ROLES["/dashboard"]).toEqual(["PARENT"]);
    expect(DASHBOARD_ROLES["/tutor-dashboard"]).toEqual(["TUTOR"]);
    expect(DASHBOARD_ROLES["/student-dashboard"]).toEqual(["STUDENT"]);
    expect(DASHBOARD_ROLES["/admin"]).toEqual([
      "SUPER_ADMIN",
      "ACADEMIC_ADMIN",
    ]);
  });
});
