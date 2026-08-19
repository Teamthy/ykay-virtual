import { apiFetch } from "@/lib/api";

export type RecordedLesson = {
  id: string;
  cohort_id?: string | null;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  status: string;
  video_url?: string | null;
};

/** The learner's recorded-lesson library across their enrolled cohorts. */
export async function listRecordedLessons(studentProfileId: string): Promise<RecordedLesson[]> {
  const res = await apiFetch<RecordedLesson[]>(
    `/me/recorded-lessons?student_profile_id=${encodeURIComponent(studentProfileId)}`
  );
  return res.data ?? [];
}
