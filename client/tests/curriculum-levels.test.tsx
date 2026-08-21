// CurriculumLevelSelect — the learner-level dropdowns (Nigerian + British
// curricula). Regression: curricula load, levels follow the selected
// curriculum, and onChange emits the level name.

import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CurriculumLevelSelect } from "@/features/onboarding/CurriculumLevelSelect";

const server = setupServer(
  http.get("/api/v1/curricula", () =>
    HttpResponse.json({
      data: [
        {
          id: "c-british",
          name: "British Curriculum",
          slug: "british",
          levels: [
            { id: "l1", name: "Year 7", slug: "year-7", sort_order: 17 },
            { id: "l2", name: "Year 8", slug: "year-8", sort_order: 18 },
          ],
        },
        {
          id: "c-nigerian",
          name: "Nigerian Curriculum",
          slug: "nigerian",
          levels: [
            { id: "l3", name: "JSS1", slug: "jss1", sort_order: 20 },
            { id: "l4", name: "JSS2", slug: "jss2", sort_order: 21 },
          ],
        },
      ],
    })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

function renderSelect(onChange?: (v: string) => void, value = "") {
  const handler = onChange ?? (() => {});
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CurriculumLevelSelect value={value} onChange={handler} />
    </QueryClientProvider>
  );
}

describe("CurriculumLevelSelect", () => {
  it("loads both curricula and populates levels per selection", async () => {
    const user = userEvent.setup();
    let picked = "";
    renderSelect((v) => (picked = v));

    // Curricula load.
    expect(await screen.findByText("British Curriculum")).toBeInTheDocument();
    expect(screen.getByText("Nigerian Curriculum")).toBeInTheDocument();

    // Level select is disabled until a curriculum is chosen.
    expect(screen.getByText(/choose a curriculum first/i)).toBeInTheDocument();

    // Choose Nigerian → its levels appear.
    await user.selectOptions(screen.getByLabelText(/curriculum/i), "c-nigerian");
    const levelSelect = screen.getByLabelText(/current level/i) as HTMLSelectElement;
    expect(levelSelect.value).toBe("JSS1"); // first level auto-selected
    expect(picked).toBe("JSS1");

    // Switch level → onChange fires.
    await user.selectOptions(levelSelect, "JSS2");
    expect(picked).toBe("JSS2");
  });

  it("pre-selects the curriculum owning an existing level value", async () => {
    renderSelect(undefined, "Year 8");
    await waitFor(() => {
      const curriculum = screen.getByLabelText(/curriculum/i) as HTMLSelectElement;
      expect(curriculum.value).toBe("c-british");
    });
    const level = screen.getByLabelText(/current level/i) as HTMLSelectElement;
    expect(level.value).toBe("Year 8");
  });
});
