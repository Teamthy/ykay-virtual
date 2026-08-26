"use client";

import { apiFetch } from "@/lib/api";

export type GradeRow = { subject: string; score: number; count: number };
export type ReviewItem = { question: string; subject: string; options: string[]; correct: string };
export type LeaderboardRow = { user_id: string; name: string; xp: number; lessons: number };
export type DashPrefs = {
  user_id: string;
  leaderboard_opt_in: boolean;
  weekly_goal: number;
  widgets: string[];
};

const qs = (spid?: string) => (spid ? `?student_profile_id=${encodeURIComponent(spid)}` : "");

export async function getDailyQuote(): Promise<string> {
  const res = await apiFetch<{ quote: string }>("/me/dashboard/quote");
  return res.data.quote;
}

export async function getGradebook(spid?: string): Promise<GradeRow[]> {
  const res = await apiFetch<GradeRow[]>(`/me/dashboard/gradebook${qs(spid)}`);
  return res.data ?? [];
}

export async function getReviewQueue(spid?: string): Promise<ReviewItem[]> {
  const res = await apiFetch<ReviewItem[]>(`/me/dashboard/review-queue${qs(spid)}`);
  return res.data ?? [];
}

export async function getLeaderboard(spid?: string): Promise<LeaderboardRow[]> {
  const res = await apiFetch<LeaderboardRow[]>(`/me/dashboard/leaderboard${qs(spid)}`);
  return res.data ?? [];
}

export async function getDashPrefs(): Promise<DashPrefs> {
  const res = await apiFetch<DashPrefs>("/me/dashboard/prefs");
  return res.data;
}

export async function updateDashPrefs(input: Partial<Pick<DashPrefs, "leaderboard_opt_in" | "weekly_goal" | "widgets">>): Promise<DashPrefs> {
  const res = await apiFetch<DashPrefs>("/me/dashboard/prefs", { method: "PUT", body: JSON.stringify(input) });
  return res.data;
}

export async function submitLessonFeedback(lessonId: string, rating: number, comment?: string, spid?: string): Promise<void> {
  await apiFetch(`/me/lessons/${lessonId}/feedback${qs(spid)}`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}
