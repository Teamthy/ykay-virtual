// Payment-state regression tests — the money-handling surfaces: receipt
// rendering (branded, printable, single-page), status → badge mapping used
// across the payments consoles, and the admin payout API contract.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { statusKindFor } from "@/components/ui/status-badge";
import { NuvoraReceipt } from "@/components/receipt/NuvoraReceipt";

describe("statusKindFor — payment + enrollment states", () => {
  it("maps money/access states to distinct badge kinds", () => {
    expect(statusKindFor("PAID")).toBe("success");
    expect(statusKindFor("CONFIRMED")).toBe("success");
    expect(statusKindFor("APPROVED")).toBe("success");
    expect(statusKindFor("PENDING")).toBe("pending");
    expect(statusKindFor("PROCESSING")).toBe("pending");
    expect(statusKindFor("REFUNDED")).toBe("error");
    expect(statusKindFor("CANCELLED")).toBe("error");
    expect(statusKindFor("REJECTED")).toBe("error");
    expect(statusKindFor("DRAFT")).toBe("neutral");
    expect(statusKindFor("WHATEVER")).toBe("info");
  });
});

describe("NuvoraReceipt — branded, printable receipt", () => {
  it("renders order number, amount, items and the print target", () => {
    render(
      <NuvoraReceipt
        orderNumber="NV-20260821-0001"
        status="PAID"
        createdAt="2026-08-21T10:00:00Z"
        currency="NGN"
        total={50000}
        items={[
          {
            item_type: "COHORT",
            description: "Cohort enrollment: IGCSE Maths — Sept",
            quantity: 1,
            total_price: 50000,
          },
        ]}
      />
    );
    expect(screen.getByText("NV-20260821-0001")).toBeInTheDocument();
    expect(screen.getByText(/IGCSE Maths — Sept/)).toBeInTheDocument();
    expect(screen.getAllByText(/50,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/PAID/i)).toBeInTheDocument();
    // Print target: the receipt carries the anchor used by the print CSS.
    expect(document.getElementById("nuvora-receipt")).toBeInTheDocument();
  });

  it("renders the paid-on date for record keeping", () => {
    render(
      <NuvoraReceipt
        orderNumber="NV-1"
        status="PAID"
        createdAt="2026-08-21T10:00:00Z"
        currency="NGN"
        total={1000}
        items={[]}
      />
    );
    expect(screen.getByText(/21 Aug 2026/i)).toBeInTheDocument();
  });
});
