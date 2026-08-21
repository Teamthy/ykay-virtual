// Learning-stats — pure helpers that turn raw LMS rows into the
// Udemy/Coursera-style dashboard numbers: per-course progress, the next
// thing to do, headline stats and achievements. Pure functions = unit-tested.

export type StatLesson = {
  id: string;
  title: string;
  cohort_id?: string | null;
  start_at?: string;
  video_url?: string | null;
  status?: string;
};

export type StatProgressRow = {
  lesson_id: string;
  watched: boolean;
};

export type CohortProgress = {
  cohortId: string;
  title: string;
  total: number;
  watched: number;
  pct: number;
  nextUnwatchedId?: string;
};

export type LearningStats = {
  totalLessons: number;
  watchedLessons: number;
  overallPct: number;
  attendancePct: number | null;
  submitted: number;
  assignmentsTotal: number;
  avgScore: number | null;
  certificates: number;
};

export function groupByCohort(
  lessons: StatLesson[],
  progressRows: StatProgressRow[],
  titles: Record<string, string>
): CohortProgress[] {
  const byCohort = new Map<string, StatLesson[]>();
  for (const l of lessons) {
    const key = l.cohort_id ?? "standalone";
    const arr = byCohort.get(key) ?? [];
    arr.push(l);
    byCohort.set(key, arr);
  }
  const watchedByLesson = new Map(progressRows.map((p) => [p.lesson_id, p.watched]));

  const out: CohortProgress[] = [];
  for (const [cohortId, list] of byCohort) {
    let watched = 0;
    let nextUnwatched: string | undefined;
    for (const l of list) {
      if (watchedByLesson.get(l.id)) {
        watched++;
      } else if (!nextUnwatched && (l.video_url || l.start_at)) {
        nextUnwatched = l.id;
      }
    }
    const pct = list.length === 0 ? 0 : Math.round((watched / list.length) * 100);
    out.push({
      cohortId,
      title: titles[cohortId] ?? (cohortId === "standalone" ? "Your classes" : "Cohort"),
      total: list.length,
      watched,
      pct,
      nextUnwatchedId: nextUnwatched,
    });
  }
  return out.sort((a, b) => b.pct - a.pct);
}

export function nextUpcoming(lessons: StatLesson[]): StatLesson | undefined {
  const now = Date.now();
  return (lessons ?? [])
    .filter((l) => l.start_at && new Date(l.start_at).getTime() > now)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())[0];
}

export function computeStats(input: {
  lessons: StatLesson[];
  progressRows: StatProgressRow[];
  attendancePct: number | null;
  submitted: number;
  assignmentsTotal: number;
  submissionScores: number[];
  certificates: number;
}): LearningStats {
  const total = input.lessons.length;
  const watched = input.lessons.filter((l) =>
    input.progressRows.some((p) => p.lesson_id === l.id && p.watched)
  ).length;
  const avgScore =
    input.submissionScores.length === 0
      ? null
      : Math.round((input.submissionScores.reduce((s, n) => s + n, 0) / input.submissionScores.length) * 10) / 10;
  return {
    totalLessons: total,
    watchedLessons: watched,
    overallPct: total === 0 ? 0 : Math.round((watched / total) * 100),
    attendancePct: input.attendancePct,
    submitted: input.submitted,
    assignmentsTotal: input.assignmentsTotal,
    avgScore,
    certificates: input.certificates,
  };
}

export type Achievement = {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
};

export function achievements(stats: LearningStats): Achievement[] {
  return [
    { id: "first", icon: "🎬", label: "First lesson watched", earned: stats.watchedLessons >= 1 },
    { id: "momentum", icon: "🔥", label: "5 lessons watched", earned: stats.watchedLessons >= 5 },
    { id: "scholar", icon: "📝", label: "First assignment submitted", earned: stats.submitted >= 1 },
    { id: "attendance", icon: "🎯", label: "80%+ attendance", earned: (stats.attendancePct ?? 0) >= 80 },
    { id: "certified", icon: "🏅", label: "Certificate earned", earned: stats.certificates >= 1 },
    { id: "master", icon: "🏆", label: "Course completed", earned: stats.totalLessons > 0 && stats.overallPct >= 100 },
  ];
}
