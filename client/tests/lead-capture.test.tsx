// LeadCapture — the money-funnel entry point. Regression tests for the form
// validation, the honeypot, the POST /leads contract and the WhatsApp
// shortcut on success (MSW-mocked network).

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LeadCapture } from "@/features/leads/LeadCapture";

const leadPosts: { url: string; body: Record<string, unknown> }[] = [];

const server = setupServer(
  http.post("/api/v1/leads", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    leadPosts.push({ url: request.url, body });
    return HttpResponse.json({ data: { received: true, id: "lead-1" } });
  }),
  http.get("/api/v1/site/contact", () =>
    HttpResponse.json({ data: { whatsapp_number: "2348012345678", whatsapp_link: "https://wa.me/2348012345678" } })
  )
);

beforeEach(() => {
  leadPosts.length = 0;
  sessionStorage.clear();
  vi.spyOn(sessionStorage, "getItem").mockReturnValue("1"); // already shown → modal stays closed
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

function renderLeadCapture(source = "/cohorts/abc") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LeadCapture source={source} delayMs={0} exitIntent={false} />
    </QueryClientProvider>
  );
}

describe("LeadCapture form", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());

  it("opens from the call-back trigger", async () => {
    const user = userEvent.setup();
    renderLeadCapture();
    await user.click(screen.getByRole("button", { name: /get a call back/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone \(whatsapp\)/i)).toBeInTheDocument();
  });

  it("validates name, phone and email before submitting", async () => {
    const user = userEvent.setup();
    renderLeadCapture();
    await user.click(screen.getByRole("button", { name: /get a call back/i }));

    await user.click(screen.getByRole("button", { name: /call me back/i }));
    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your name/i), "Ada");
    await user.type(screen.getByLabelText(/phone \(whatsapp\)/i), "abc");
    await user.click(screen.getByRole("button", { name: /call me back/i }));
    expect(await screen.findByText(/valid phone number/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/phone \(whatsapp\)/i));
    await user.type(screen.getByLabelText(/phone \(whatsapp\)/i), "+2348012345678");
    await user.type(screen.getByLabelText(/email \(optional\)/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /call me back/i }));
    expect(await screen.findByText(/doesn't look right/i)).toBeInTheDocument();
    expect(leadPosts).toHaveLength(0);
  });

  it("posts the lead with source and callback intent, then shows the WhatsApp shortcut", async () => {
    const user = userEvent.setup();
    renderLeadCapture("/programmes/gcse-maths");

    await user.click(screen.getByRole("button", { name: /get a call back/i }));
    await user.type(screen.getByLabelText(/your name/i), "Adaeze Okonkwo");
    await user.type(screen.getByLabelText(/phone \(whatsapp\)/i), "+2348012345678");
    await user.type(screen.getByLabelText(/email \(optional\)/i), "adaeze@example.com");
    await user.type(screen.getByLabelText(/anything specific/i), "JSS2 maths");
    await user.click(screen.getByRole("button", { name: /call me back/i }));

    await waitFor(() => expect(leadPosts).toHaveLength(1));
    const { body } = leadPosts[0];
    expect(body.name).toBe("Adaeze Okonkwo");
    expect(body.phone).toBe("+2348012345678");
    expect(body.email).toBe("adaeze@example.com");
    expect(body.source).toBe("/programmes/gcse-maths");
    expect(body.intent).toBe("CALLBACK_REQUEST");
    expect(body.website).toBe(""); // honeypot always empty from the UI

    // Success state: WhatsApp shortcut with the prefill.
    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
    const wa = screen.getByRole("link", { name: /chat with us now on whatsapp/i });
    expect(wa).toHaveAttribute("href", expect.stringContaining("wa.me/2348012345678"));
    expect(wa).toHaveAttribute("target", "_blank");
  });
});
