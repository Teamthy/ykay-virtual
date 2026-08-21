import { describe, expect, it } from "vitest";
import {
  groupByCohort,
  nextUpcoming,
  computeStats,
  achievements,
  type StatLesson,
} from "@/lib/learning-stats";

const lesson = (id: string, cohort: string | null, startAt?: string, video?: string): StatLesson => ({
  id,
  title: `Lesson ${id}`,
  cohort_id: cohort,
  start_at: startAt,
  video_url: video ?? null,
});

describe("groupByCohort — per-course progress (Udemy-style)", () => {
  it("computes watched counts, percentage and the next unwatched lesson", () => {
    const rows = [
      { id: "l1", title: "A", cohort_id: "c1", video_url: "v" },
      { id: "l2", title: "B", cohort_id: "c1", video_url: "v" },
      { id: "l3", title: "C", cohort_id: "c2", video_url: "v" },
    ];
    const courses = groupByCohort(
      rows,
      [
        { lesson_id: "l1", watched: true },
        { lesson_id: "l2", watched: false },
      ],
      { c1: "IGCSE Maths", c2: "Python Basics" }
    );

    expect(courses).toHaveLength(2);
    const maths = courses.find((c) => c.cohortId === "c1")!;
    expect(maths.total).toBe(2);
    expect(maths.watched).toBe(1);
    expect(maths.pct).toBe(50);
    expect(maths.nextUnwatchedId).toBe("l2");
    expect(maths.title).toBe("IGCSE Maths");
  });

  it("handles standalone lessons (no cohort) under a default title", () => {
    const courses = groupByCohort([lesson("x", null, undefined, "v")], [{ lesson_id: "x", watched: false }], {});
    expect(courses).toHaveLength(1);
    expect(courses[0].pct).toBe(0);
    expect(courses[0].title).toBe("Your classes");
  });
});

describe("nextUpcoming", () => {
  it("returns the soonest future lesson and ignores past ones", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const sooner = new Date(Date.now() + 600_000).toISOString();
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const next = nextUpcoming([
      lesson("a", "c1", future),
      lesson("b", "c1", past),
      lesson("c", "c1", sooner),
    ]);
    expect(next?.id).toBe("c");
  });
});

describe("computeStats + achievements", () => {
  it("computes headline stats and achievement set", () => {
    const stats = computeStats({
      lessons: [
        { id: "l1", title: "A", cohort_id: "c1" },
        { id: "l2", title: "B", cohort_id: "c1" },
      ],
      progressRows: [{ lesson_id: "l1", watched: true }],
      attendancePct: 85,
      submitted: 1,
      assignmentsTotal: 3,
      submissionScores: [16, 18],
      certificates: 0,
    });
    expect(stats.overallPct).toBe(50);
    expect(stats.avgScore).toBe(17);
    expect(stats.attendancePct).toBe(85);

    const earned = achievements(stats).filter((a) => a.earned);
    expect(earned.map((a) => a.id)).toEqual(["first", "scholar", "attendance"]);
  });
});
