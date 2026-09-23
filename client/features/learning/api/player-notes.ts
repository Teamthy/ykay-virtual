import { apiFetch } from "@/lib/api";

export type PlayerNote = {
  id: string;
  lesson_id: string;
  user_id: string;
  role: "STUDENT" | "PARENT" | "TUTOR";
  timestamp_sec: number;
  is_bookmark: boolean;
  text: string;
  created_at: string;
};

/** Shared participant notes/bookmarks for a lesson (feature 5). */
export async function listPlayerNotes(lessonId: string): Promise<PlayerNote[]> {
  const res = await apiFetch<PlayerNote[]>(`/lessons/${lessonId}/player-notes`);
  return res.data ?? [];
}

export async function addPlayerNote(
  lessonId: string,
  input: { role: PlayerNote["role"]; timestamp_sec: number; is_bookmark?: boolean; text?: string },
): Promise<PlayerNote> {
  const res = await apiFetch<PlayerNote>(`/lessons/${lessonId}/player-notes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deletePlayerNote(id: string): Promise<void> {
  await apiFetch(`/me/player-notes/${id}`, { method: "DELETE" });
}

/** mm:ss for a jump-to timestamp. */
export function fmtTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
