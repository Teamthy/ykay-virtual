import { apiFetch } from "@/lib/api";

export type TopicMastery = {
  subject: string;
  topic: string;
  attempts: number;
  correct: number;
  mastery: number; // 0-100
};

/**
 * Topic-mastery heatmap data (feature 2). Own view, or a parent's per-child view
 * via student_profile_id. Returns [] (never fabricated) when there is no history.
 */
export async function getMastery(opts: { subject?: string; studentProfileId?: string } = {}): Promise<TopicMastery[]> {
  const q = new URLSearchParams();
  if (opts.subject) q.set("subject", opts.subject);
  if (opts.studentProfileId) q.set("student_profile_id", opts.studentProfileId);
  const qs = q.toString();
  const res = await apiFetch<TopicMastery[]>(`/me/learning/mastery${qs ? `?${qs}` : ""}`);
  return res.data ?? [];
}

/** Brand-safe band for a mastery cell. Lime=strong, cream=developing,
 * amber=needs work. All bands pair with dark text for WCAG contrast. */
export function masteryBand(m: number): "strong" | "developing" | "needs" {
  if (m >= 75) return "strong";
  if (m >= 50) return "developing";
  return "needs";
}
